import { createParser } from 'eventsource-parser';
import type { StreamChunk, WorkflowEvent } from './types';

export type SseEventHandler = (event: WorkflowEvent) => void;
export type SseErrorHandler = (error: Error) => void;

export interface SseConnection {
  close: () => void;
}

export function connectWorkflowStream(
  baseUrl: string,
  apiKey: string,
  workflowId: string,
  onEvent: SseEventHandler,
  onError: SseErrorHandler,
  signal?: AbortSignal
): SseConnection {
  const abortController = new AbortController();

  signal?.addEventListener('abort', () => abortController.abort());

  const url = `${baseUrl.replace(/\/$/, '')}/v1/workflows/${workflowId}/stream`;

  (async () => {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'text/event-stream',
        },
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const parser = createParser({
        onEvent(evt) {
          if (evt.data) {
            try {
              const parsed = JSON.parse(evt.data) as WorkflowEvent;
              onEvent(parsed);
            } catch {
              // ignore malformed JSON
            }
          }
        },
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.feed(decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return {
    close: () => abortController.abort(),
  };
}

export type StreamChunkHandler = (chunk: StreamChunk) => void;

export function streamAgentResponse(
  baseUrl: string,
  apiKey: string,
  body: Record<string, unknown>,
  onChunk: StreamChunkHandler,
  onError: SseErrorHandler,
  signal?: AbortSignal
): SseConnection {
  const abortController = new AbortController();
  signal?.addEventListener('abort', () => abortController.abort());

  const url = `${baseUrl.replace(/\/$/, '')}/v1/responses`;

  (async () => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ ...body, stream: true }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const parser = createParser({
        onEvent(evt) {
          if (!evt.data) return;
          try {
            const parsed = JSON.parse(evt.data) as StreamChunk;
            onChunk(parsed);
          } catch {
            // ignore malformed JSON
          }
        },
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.feed(decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return {
    close: () => abortController.abort(),
  };
}
