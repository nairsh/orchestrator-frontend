import { useState, useEffect, useRef, useCallback } from 'react';
import { connectWorkflowStream } from '../api/sse';
import { continueWorkflow, getWorkflow, getWorkflowTrace } from '../api/client';
import type { ApiConfig } from '../api/client';
import { toastApiError } from '../lib/toast';
import type { WorkflowEvent, FeedEntry, LiveTask, WorkflowTraceStep } from '../api/types';

import type { WorkflowStreamState, EventReducerContext } from './workflow';
import { STALE_THRESHOLD_MS, MAX_RECONNECT_ATTEMPTS } from './workflow';
import { isInternalCapabilityDump } from './workflow';
import { normalizeTaskStatus, upsertTask, deriveTaskModelByIdFromTrace } from './workflow';
import {
  shouldAppendCompletionEntry,
  buildFeedFromTrace,
  getHydratedFailureReason,
  buildPendingClarificationFromToolPayload,
} from './workflow';
import { reduceWorkflowEvent } from './workflow';

export type { WorkflowStreamState };

export function useWorkflowStream(
  config: ApiConfig,
  workflowId: string,
  isActive: boolean,
  objective?: string
): WorkflowStreamState {
  const [state, setState] = useState<WorkflowStreamState>(() => ({
    feed: objective ? [{ kind: 'prompt', text: objective }] : [],
    liveTasks: [],
    isTerminal: false,
    hydrated: false,
    currentActivity: 'Initializing…',
    thinkingText: '',
    isStale: false,
    workflowStatus: 'pending',
    sendMessage: async () => undefined,
    handleApproval: async () => undefined,
    handleBashApproval: async () => undefined,
  }));

  const connectionRef = useRef<{ close: () => void } | null>(null);
  const seqRef = useRef(0);
  const pendingEnvironmentSetupRef = useRef(false);
  const handleEventRef = useRef<(event: WorkflowEvent) => void>(() => undefined);
  const lastEventTimeRef = useRef(Date.now());
  const staleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Staleness detector: if no SSE events arrive for 30s while not terminal,
  // mark the stream as stale so the UI can show a warning.
  useEffect(() => {
    if (state.isTerminal || !isActive) {
      if (staleTimerRef.current) clearInterval(staleTimerRef.current);
      return;
    }
    lastEventTimeRef.current = Date.now();
    staleTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastEventTimeRef.current;
      if (elapsed >= STALE_THRESHOLD_MS) {
        setState((prev) => {
          if (prev.isTerminal || prev.isStale) return prev;
          return { ...prev, isStale: true };
        });
      }
    }, 5_000);
    return () => {
      if (staleTimerRef.current) clearInterval(staleTimerRef.current);
    };
  }, [state.isTerminal, isActive]);

  const connect = useCallback(() => {
    if (!isActive) return;
    if (!config.baseUrl) return;

    // Clear any pending reconnect timer to avoid stale reconnects
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    connectionRef.current?.close();
    connectionRef.current = connectWorkflowStream(
      {
        baseUrl: config.baseUrl,
        getAuthToken: config.getAuthToken,
      },
      workflowId,
      (event) => {
        reconnectAttemptsRef.current = 0;
        handleEventRef.current(event);
      },
      (err) => {
        const attempts = reconnectAttemptsRef.current;
        if (attempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current = attempts + 1;
          const backoffMs = Math.min(1000 * Math.pow(2, attempts), 10_000);
          setState((prev) => {
            if (prev.isTerminal) return prev;
            return { ...prev, currentActivity: `Reconnecting (attempt ${attempts + 1}/${MAX_RECONNECT_ATTEMPTS})…` };
          });
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, backoffMs);
        } else {
          setState((prev) => ({ ...prev, currentActivity: `Stream error: ${err.message}` }));
        }
      }
    );
  }, [config.baseUrl, config.getAuthToken, workflowId, isActive]);

  // Hydrate from REST on mount
  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;

    seqRef.current = 0;

    (async () => {
      try {
        const [details, traceRes] = await Promise.all([
          getWorkflow(config, workflowId),
          getWorkflowTrace(config, workflowId),
        ]);
        if (cancelled) return;

        const isTerminal = ['completed', 'failed', 'cancelled'].includes(details.workflow.status);

        const prompt =
          (details.workflow.user_prompt && String(details.workflow.user_prompt)) ||
          (details.workflow.objective && String(details.workflow.objective)) ||
          objective;

        let liveTasks: LiveTask[] = [];
        details.tasks.forEach((t) => {
          liveTasks = upsertTask(liveTasks, {
            id: t.task_id,
            description: t.description,
            agent_type: t.agent_type,
            status: normalizeTaskStatus(t.status),
            tool_calls: 0,
          });
        });

        const trace = Array.isArray(traceRes.trace) ? (traceRes.trace as WorkflowTraceStep[]) : [];
        const traceModelsByTaskId = deriveTaskModelByIdFromTrace(trace);

        liveTasks = liveTasks.map((task) => ({
          ...task,
          model: traceModelsByTaskId[task.id] ?? task.model,
        }));

        const feed = buildFeedFromTrace(trace, prompt, liveTasks);
        const traceClarification = [...feed]
          .reverse()
          .filter((entry): entry is Extract<FeedEntry, { kind: 'tool_call' }> => entry.kind === 'tool_call')
          .map((entry) => buildPendingClarificationFromToolPayload(entry.input, entry.output))
          .find((entry) => entry !== undefined);

        // If already terminal and no completion entry exists, add one.
        const withCompletion: FeedEntry[] = (() => {
          if (!isTerminal) return feed;
          if (feed.some((e) => e.kind === 'completion')) return feed;
          if (details.workflow.status === 'completed') {
            const output = isInternalCapabilityDump(details.workflow.output ?? undefined)
              ? undefined
              : details.workflow.output ?? undefined;
            if (!shouldAppendCompletionEntry(feed, output)) return feed;
            return [...feed, { kind: 'completion', output } as FeedEntry];
          }
          if (details.workflow.status === 'cancelled') {
            return [...feed, { kind: 'ai_message', text: 'Workflow cancelled' } as FeedEntry];
          }
          const failureReason = getHydratedFailureReason(details);
          return [
            ...feed,
            { kind: 'ai_message', text: `Workflow failed: ${failureReason ?? 'No failure details from backend'}` } as FeedEntry,
          ];
        })();

        setState((prev) => ({
          ...prev,
          feed: withCompletion,
          liveTasks,
          isTerminal,
          hydrated: true,
          currentActivity:
            details.workflow.status === 'paused'
              ? 'Waiting for your reply…'
              : isTerminal
                ? 'Completed'
                : 'Executing…',
          workflowStatus: details.workflow.status,
          startedAt: details.workflow.started_at,
          endedAt: details.workflow.ended_at ?? details.workflow.completed_at,
          pendingClarification:
            details.workflow.status === 'paused'
              ? traceClarification ?? {
                  question: details.workflow.pending_clarification ?? details.workflow.pause_reason ?? 'Waiting for your reply…',
                  allowCustom: true,
                }
              : undefined,
        }));

        if (!isTerminal) {
          connect();
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          setState((prev) => ({
            ...prev,
            isTerminal: true,
            currentActivity: 'Connection failed',
            workflowStatus: 'failed',
            feed: [
              ...prev.feed,
              { kind: 'ai_message', text: `Failed to load workflow: ${msg}` } as FeedEntry,
            ],
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [config, workflowId, isActive, objective, connect]);

  const handleEvent = useCallback((event: WorkflowEvent) => {
    lastEventTimeRef.current = Date.now();
    setState((prev) => {
      if (prev.isStale) prev = { ...prev, isStale: false };

      const ctx: EventReducerContext = {
        seq: () => seqRef.current++,
        pendingEnvironmentSetup: pendingEnvironmentSetupRef.current,
      };

      const next = reduceWorkflowEvent(prev, event, ctx);
      pendingEnvironmentSetupRef.current = ctx.pendingEnvironmentSetup;
      return next;
    });
  }, []);

  handleEventRef.current = handleEvent;

  useEffect(() => {
    return () => {
      connectionRef.current?.close();
      connectionRef.current = null;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const msg = text.trim();
      if (!msg) return;

      // Snapshot state before optimistic update so we can restore on failure
      let snapshotState: WorkflowStreamState | null = null;

      setState((prev) => {
        snapshotState = prev;
        const isClarificationReply = prev.workflowStatus === 'paused' || !!prev.pendingClarification;
        pendingEnvironmentSetupRef.current = !isClarificationReply;

        return {
          ...prev,
          feed: isClarificationReply
            ? [...prev.feed, { kind: 'user_message', text: msg }]
            : [...prev.feed, { kind: 'user_message', text: msg }, { kind: 'system_status', text: 'Starting environment…' }],
          liveTasks: isClarificationReply ? prev.liveTasks : [],
          isTerminal: false,
          currentActivity: isClarificationReply ? 'Resuming…' : 'Starting environment…',
          workflowStatus: 'executing',
          pendingClarification: undefined,
        };
      });

      try {
        await continueWorkflow(config, workflowId, msg);
      } catch (error) {
        pendingEnvironmentSetupRef.current = false;
        // Restore to pre-optimistic state so paused/clarification workflows don't appear failed
        setState((prev) => ({
          ...prev,
          feed: snapshotState?.feed ?? prev.feed.filter(
            (e) => !(e.kind === 'system_status' && e.text === 'Starting environment…')
          ),
          isTerminal: snapshotState?.isTerminal ?? prev.isTerminal,
          currentActivity: snapshotState?.currentActivity ?? '',
          workflowStatus: snapshotState?.workflowStatus ?? prev.workflowStatus,
          pendingClarification: snapshotState?.pendingClarification,
        }));
        throw error;
      }

      // The SSE stream ends after completion/failure. Restart on continuation.
      connect();
    },
    [config, workflowId, connect]
  );

  const handleApproval = useCallback(
    async (taskId: string, approved: boolean) => {
      try {
        const { approveWorkflowTask } = await import('../api/client');
        await approveWorkflowTask(config, workflowId, taskId, approved);
      } catch (err) {
        toastApiError(err, approved ? "Couldn't approve this action" : "Couldn't reject this action");
      }
    },
    [config, workflowId]
  );

  const handleBashApproval = useCallback(
    async (approvalId: string, approved: boolean) => {
      try {
        const { approveBashCommand } = await import('../api/client');
        await approveBashCommand(config, workflowId, approvalId, approved ? 'approve' : 'deny');
      } catch (err) {
        toastApiError(err, approved ? "Couldn't approve this command" : "Couldn't reject this command");
      }
    },
    [config, workflowId]
  );

  return { ...state, sendMessage, handleApproval, handleBashApproval };
}
