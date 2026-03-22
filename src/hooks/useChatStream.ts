import { useCallback, useRef, useState } from 'react';
import { streamAgentResponse } from '../api/sse';
import { toastApiError } from '../lib/toast';
import type { ApiConfig } from '../api/client';
import type { StreamChunk } from '../api/types';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

interface UseChatStreamOptions {
  config: ApiConfig;
  model: string;
}

/**
 * Shared hook that encapsulates the SSE streaming logic duplicated
 * across ChatModal and FullPageChat.
 */
export function useChatStream({ config, model }: UseChatStreamOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [draftAssistant, setDraftAssistant] = useState('');
  const assistantBufferRef = useRef('');
  const abortRef = useRef<{ close: () => void } | null>(null);

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

      setStreaming(true);
      assistantBufferRef.current = '';
      setDraftAssistant('');
      setMessages((prev) => [...prev, { role: 'user', content: text }]);

      abortRef.current?.close();
      abortRef.current = streamAgentResponse(
        {
          baseUrl: config.baseUrl,
          getAuthToken: config.getAuthToken,
        },
        { model, input: text },
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
              setMessages((prev) => [...prev, { role: 'assistant', content: finalText }]);
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
            toastApiError(new Error(message), 'Agent error');
            assistantBufferRef.current = '';
            setDraftAssistant('');
            abortRef.current?.close();
            abortRef.current = null;
          }
        },
        (err: Error) => {
          setStreaming(false);
          toastApiError(err, 'Stream error');
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

  return { messages, streaming, draftAssistant, canSend, send, abort };
}
