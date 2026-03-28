import { createParser } from 'eventsource-parser';
import type { StreamChunk, WorkflowEvent } from './types';
import { resolveAuthToken } from './core';

export type SseEventHandler = (event: WorkflowEvent) => void;
export type SseErrorHandler = (error: Error) => void;

export interface SseConnection {
  close: () => void;
}

export interface SseConfig {
  baseUrl: string;
  getAuthToken?: () => Promise<string | null>;
}

export function connectWorkflowStream(
  config: SseConfig,
  workflowId: string,
  onEvent: SseEventHandler,
  onError: SseErrorHandler,
  signal?: AbortSignal
): SseConnection {
  const abortController = new AbortController();

  const abortHandler = () => abortController.abort();
  signal?.addEventListener('abort', abortHandler);

  const url = `${config.baseUrl.replace(/\/$/, '')}/v1/workflows/${workflowId}/stream`;

  (async () => {
    try {
      const token = await resolveAuthToken(config);
      const headers: Record<string, string> = {
        Accept: 'text/event-stream',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        headers,
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

      let receivedTerminal = false;

      const parser = createParser({
        onEvent(evt) {
          if (evt.data) {
            try {
              const parsed = JSON.parse(evt.data) as WorkflowEvent;
              if (parsed.type === 'workflow_completed' || parsed.type === 'workflow_failed') {
                receivedTerminal = true;
              }
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

      // If the stream closed without a terminal event and wasn't
      // user-aborted, treat it as an unexpected disconnect so reconnect fires.
      if (!receivedTerminal && !abortController.signal.aborted) {
        onError(new Error('SSE stream ended unexpectedly'));
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return {
    close: () => {
      signal?.removeEventListener('abort', abortHandler);
      abortController.abort();
    },
  };
}

export type StreamChunkHandler = (chunk: StreamChunk) => void;

export function streamAgentResponse(
  config: SseConfig,
  body: Record<string, unknown>,
  onChunk: StreamChunkHandler,
  onError: SseErrorHandler,
  signal?: AbortSignal
): SseConnection {
  const abortController = new AbortController();
  const abortHandler = () => abortController.abort();
  signal?.addEventListener('abort', abortHandler);

  const url = `${config.baseUrl.replace(/\/$/, '')}/v1/responses`;

  (async () => {
    try {
      const token = await resolveAuthToken(config);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
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
      let receivedDone = false;

      const parser = createParser({
        onEvent(evt) {
          if (!evt.data) return;
          try {
            const parsed = JSON.parse(evt.data) as StreamChunk;
            if (parsed.type === 'done') receivedDone = true;
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

      // If server closed without sending a `done` event, treat as interrupted stream
      if (!receivedDone) {
        onError(new Error('Stream ended unexpectedly'));
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return {
    close: () => {
      signal?.removeEventListener('abort', abortHandler);
      abortController.abort();
    },
  };
}
