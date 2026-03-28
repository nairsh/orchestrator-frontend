import { useCallback, useEffect, useRef, useState } from 'react';
import { streamAgentResponse } from '../api/sse';
import { toastApiError } from '../lib/toast';
import { humanizeError } from '../lib/humanizeError';
import type { ApiConfig } from '../api/client';
import type { StreamChunk } from '../api/types';

export type ChatMessage = { role: 'user' | 'assistant'; content: string; timestamp?: number; error?: boolean; model?: string };

const STORAGE_KEY = 'relay-chat-history';

function loadPersistedMessages(): ChatMessage[] {
  try {
    // Try localStorage first (persistent), fall back to sessionStorage (legacy)
    const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const msgs = JSON.parse(raw) as ChatMessage[];
      // Migrate from sessionStorage to localStorage
      if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, raw);
        sessionStorage.removeItem(STORAGE_KEY);
      }
      return msgs;
    }
    return [];
  } catch {
    return [];
  }
}

function persistMessages(messages: ChatMessage[]) {
  try {
    const trimmed = messages.slice(-50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* quota exceeded — silently ignore */ }
}

interface UseChatStreamOptions {
  config: ApiConfig;
  model: string;
}

/**
 * Shared hook that encapsulates the SSE chat streaming logic.
 */
export function useChatStream({ config, model }: UseChatStreamOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(loadPersistedMessages);
  const [streaming, setStreaming] = useState(false);
  const [draftAssistant, setDraftAssistant] = useState('');
  const assistantBufferRef = useRef('');
  const abortRef = useRef<{ close: () => void } | null>(null);
  const messagesRef = useRef(messages);
  const rafRef = useRef<number | null>(null);
  const draftDirtyRef = useRef(false);
  const modelRef = useRef(model);
  modelRef.current = model;

  // Keep ref in sync for use in callbacks
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Persist messages whenever they change
  useEffect(() => {
    persistMessages(messages);
  }, [messages]);

  // Clean up SSE stream and pending RAF on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.close();
      abortRef.current = null;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      draftDirtyRef.current = false;
    };
  }, []);

  const canSend = useCallback(
    (input: string) => input.trim().length > 0 && !streaming,
    [streaming],
  );

  const send = useCallback(
    (text: string): boolean => {
      if (!text || streaming) return false;
      if (!config.baseUrl.trim()) {
        toastApiError(new Error('Missing base URL'), 'Not connected');
        return false;
      }

      const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() };
      const updatedMessages = [...messagesRef.current, userMsg];

      setStreaming(true);
      assistantBufferRef.current = '';
      setDraftAssistant('');
      setMessages(updatedMessages);

      // Send full conversation history so the model has context
      const conversationInput = updatedMessages.map(m => ({ role: m.role, content: m.content }));

      abortRef.current?.close();
      abortRef.current = streamAgentResponse(
        {
          baseUrl: config.baseUrl,
          getAuthToken: config.getAuthToken,
        },
        { model, input: conversationInput },
        (chunk: StreamChunk) => {
          if (chunk.type === 'text_delta' && chunk.text) {
            assistantBufferRef.current += chunk.text;
            // Batch draft updates via RAF to avoid per-token re-renders
            if (!draftDirtyRef.current) {
              draftDirtyRef.current = true;
              rafRef.current = requestAnimationFrame(() => {
                draftDirtyRef.current = false;
                setDraftAssistant(assistantBufferRef.current);
              });
            }
            return;
          }

          if (chunk.type === 'done') {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            draftDirtyRef.current = false;
            setStreaming(false);
            const finalText = assistantBufferRef.current;
            if (finalText) {
              setMessages((prev) => [...prev, { role: 'assistant', content: finalText, timestamp: Date.now(), model }]);
            }
            assistantBufferRef.current = '';
            setDraftAssistant('');
            abortRef.current?.close();
            abortRef.current = null;
            return;
          }

          if (chunk.type === 'error') {
            if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
            draftDirtyRef.current = false;
            setStreaming(false);
            const rawMessage =
              chunk.data && typeof chunk.data === 'object' && 'message' in (chunk.data as Record<string, unknown>)
                ? String((chunk.data as { message?: unknown }).message ?? 'Unknown error')
                : 'Unknown error';
            setMessages((prev) => [...prev, { role: 'assistant', content: humanizeError(rawMessage), timestamp: Date.now(), error: true }]);
            assistantBufferRef.current = '';
            setDraftAssistant('');
            abortRef.current?.close();
            abortRef.current = null;
          }
        },
        (err: Error) => {
          setStreaming(false);
          const partial = assistantBufferRef.current;
          // Preserve any partial assistant text, then show the error
          if (partial) {
            setMessages((prev) => [...prev, { role: 'assistant', content: partial, timestamp: Date.now(), model }]);
          }
          setMessages((prev) => [...prev, { role: 'assistant', content: humanizeError(err.message || 'Connection error'), timestamp: Date.now(), error: true }]);
          assistantBufferRef.current = '';
          setDraftAssistant('');
          abortRef.current?.close();
          abortRef.current = null;
        },
      );

      return true;
    },
    [config.baseUrl, config.getAuthToken, model, streaming],
  );

  const abort = useCallback((persistPartial = true) => {
    abortRef.current?.close();
    abortRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    draftDirtyRef.current = false;
    setStreaming(false);
    const partial = assistantBufferRef.current;
    if (persistPartial && partial) {
      setMessages((prev) => [...prev, { role: 'assistant', content: partial, timestamp: Date.now(), model: modelRef.current }]);
    }
    assistantBufferRef.current = '';
    setDraftAssistant('');
  }, []);

  const clearHistory = useCallback(() => {
    abortRef.current?.close();
    abortRef.current = null;
    setStreaming(false);
    assistantBufferRef.current = '';
    setDraftAssistant('');
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  return { messages, streaming, draftAssistant, canSend, send, abort, clearHistory };
}
