import { useCallback, useEffect, useRef, useState } from 'react';
import { streamAgentResponse } from '../api/sse';
import { toastApiError } from '../lib/toast';
import type { ApiConfig } from '../api/client';
import type { StreamChunk } from '../api/types';

export type ChatMessage = { role: 'user' | 'assistant'; content: string; timestamp?: number; error?: boolean };

const STORAGE_KEY = 'relay-chat-history';

function loadPersistedMessages(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function persistMessages(messages: ChatMessage[]) {
  try {
    // Keep only the last 50 messages to avoid storage limits
    const trimmed = messages.slice(-50);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
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

  // Keep ref in sync for use in callbacks
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Persist messages whenever they change
  useEffect(() => {
    persistMessages(messages);
  }, [messages]);

  const canSend = useCallback(
    (input: string) => input.trim().length > 0 && !streaming,
    [streaming],
  );

  const send = useCallback(
    (text: string) => {
      if (!text || streaming) return;
      if (!config.baseUrl.trim()) {
        toastApiError(new Error('Missing base URL'), 'Not connected');
        return;
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
            setDraftAssistant(assistantBufferRef.current);
            return;
          }

          if (chunk.type === 'done') {
            setStreaming(false);
            const finalText = assistantBufferRef.current;
            if (finalText) {
              setMessages((prev) => [...prev, { role: 'assistant', content: finalText, timestamp: Date.now() }]);
            }
            assistantBufferRef.current = '';
            setDraftAssistant('');
            abortRef.current?.close();
            abortRef.current = null;
            return;
          }

          if (chunk.type === 'error') {
            setStreaming(false);
            const message =
              chunk.data && typeof chunk.data === 'object' && 'message' in (chunk.data as Record<string, unknown>)
                ? String((chunk.data as { message?: unknown }).message ?? 'Unknown error')
                : 'Unknown error';
            // Show error inline in chat instead of just a toast
            setMessages((prev) => [...prev, { role: 'assistant', content: message, timestamp: Date.now(), error: true }]);
            assistantBufferRef.current = '';
            setDraftAssistant('');
            abortRef.current?.close();
            abortRef.current = null;
          }
        },
        (err: Error) => {
          setStreaming(false);
          // Show connection error inline in chat
          setMessages((prev) => [...prev, { role: 'assistant', content: err.message || 'Connection error', timestamp: Date.now(), error: true }]);
          assistantBufferRef.current = '';
          setDraftAssistant('');
          abortRef.current?.close();
          abortRef.current = null;
        },
      );
    },
    [config.baseUrl, config.getAuthToken, model, streaming],
  );

  const abort = useCallback(() => {
    abortRef.current?.close();
    abortRef.current = null;
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([]);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  return { messages, streaming, draftAssistant, canSend, send, abort, clearHistory };
}
