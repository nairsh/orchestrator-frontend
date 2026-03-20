import { useState, useEffect, useRef, useCallback } from 'react';
import { connectWorkflowStream } from '../api/sse';
import { continueWorkflow, getWorkflow, getWorkflowTrace } from '../api/client';
import type { ApiConfig } from '../api/client';
import type {
  WorkflowEvent,
  WorkflowTask,
  TaskStatus,
  TaskStartedData,
  TaskAddedData,
  ToolEventData,
  TasksInitializedData,
  WorkflowCompletedData,
  WorkflowFailedData,
  FeedEntry,
  LiveTask,
  WorkflowTraceStep,
} from '../api/types';

const normalizeTaskStatus = (status: string): TaskStatus => {
  const valid = ['pending', 'running', 'completed', 'failed', 'blocked', 'cancelled', 'skipped'];
  return valid.includes(status) ? (status as TaskStatus) : 'pending';
};

const upsertTask = (tasks: LiveTask[], next: LiveTask): LiveTask[] => {
  const index = tasks.findIndex((t) => t.id === next.id);
  if (index < 0) return [...tasks, next];
  return tasks.map((t, i) => (i === index ? { ...t, ...next } : t));
};

const normalizeComparableText = (text?: string): string =>
  (typeof text === 'string' ? text : '').trim().replace(/\s+/g, ' ');

const shouldAppendCompletionEntry = (feed: FeedEntry[], output?: string): boolean => {
  const normalizedOutput = normalizeComparableText(output);
  if (!normalizedOutput) return true;

  for (let i = feed.length - 1; i >= 0; i -= 1) {
    const entry = feed[i];
    if (entry.kind === 'planning') continue;

    if (entry.kind === 'completion') {
      return normalizeComparableText(entry.output) !== normalizedOutput;
    }

    if (entry.kind === 'ai_message') {
      return normalizeComparableText(entry.text) !== normalizedOutput;
    }

    return true;
  }

  return true;
};

export interface WorkflowStreamState {
  feed: FeedEntry[];
  liveTasks: LiveTask[];
  isTerminal: boolean;
  currentActivity: string;
  error?: string;
  sendMessage: (text: string) => Promise<void>;
}

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
    currentActivity: 'Initializing…',
    sendMessage: async () => undefined,
  }));

  const connectionRef = useRef<{ close: () => void } | null>(null);
  const seqRef = useRef(0);
  const handleEventRef = useRef<(event: WorkflowEvent) => void>(() => undefined);

  const connect = useCallback(() => {
    if (!isActive) return;
    if (!config.baseUrl || !config.apiKey) return;

    connectionRef.current?.close();
    connectionRef.current = connectWorkflowStream(
      config.baseUrl,
      config.apiKey,
      workflowId,
      (event) => handleEventRef.current(event),
      (err) => {
        setState((prev) => ({ ...prev, currentActivity: `Stream error: ${err.message}` }));
      }
    );
  }, [config.baseUrl, config.apiKey, workflowId, isActive]);

  const buildFeedFromTrace = useCallback(
    (trace: WorkflowTraceStep[], prompt?: string): FeedEntry[] => {
      const feed: FeedEntry[] = [];
      if (prompt) feed.push({ kind: 'prompt', text: prompt });

      for (const step of trace) {
        const taskId = step.subagent_id ?? 'orchestrator';

        if (step.step_type === 'orchestrator_message' && step.message_content) {
          const message = step.message_content.trim();
          if (!message) continue;
          if (/^workflow created:/i.test(message)) continue;
          feed.push({ kind: 'ai_message', text: message });
          continue;
        }

        if (step.step_type === 'tool_call' || step.step_type === 'subagent_tool_call') {
          if (!step.tool_name) continue;
          feed.push({
            kind: 'tool_call',
            id: step.step_id,
            toolName: step.tool_name,
            input: step.tool_input,
            taskId,
            status: 'running',
            at: step.timestamp,
          });
          continue;
        }

        if (step.step_type === 'tool_result' || step.step_type === 'subagent_tool_result') {
          if (!step.tool_name) continue;
          let marked = false;
          for (let i = feed.length - 1; i >= 0; i--) {
            const entry = feed[i];
            if (
              entry.kind === 'tool_call' &&
              entry.taskId === taskId &&
              entry.toolName === step.tool_name &&
              entry.status === 'running'
            ) {
              feed[i] = { ...entry, status: 'done', output: step.tool_output };
              marked = true;
              break;
            }
          }
          if (!marked) {
            feed.push({
              kind: 'tool_call',
              id: step.step_id,
              toolName: step.tool_name,
              input: null,
              taskId,
              status: 'done',
              output: step.tool_output,
              at: step.timestamp,
            });
          }
        }
      }

      // Mark any still-running historical tool calls as done to avoid a stuck UI.
      return feed.map((e) => (e.kind === 'tool_call' && e.status === 'running' ? { ...e, status: 'done' } : e));
    },
    []
  );

  const getHydratedFailureReason = (details: Awaited<ReturnType<typeof getWorkflow>>): string | undefined => {
    const workflowError = typeof details.workflow.error === 'string' ? details.workflow.error.trim() : '';
    if (workflowError) return workflowError;

    const workflowOutput = typeof details.workflow.output === 'string' ? details.workflow.output.trim() : '';
    if (workflowOutput) return workflowOutput;

    const failedTaskWithOutput = details.tasks.find((task) => {
      if (task.status !== 'failed') return false;
      return typeof task.output === 'string' && task.output.trim().length > 0;
    });
    if (failedTaskWithOutput?.output) return failedTaskWithOutput.output.trim();

    return undefined;
  };

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

        const isTerminal =
          details.workflow.status === 'completed' ||
          details.workflow.status === 'failed' ||
          details.workflow.status === 'cancelled';

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

        // Build feed from persisted trace
        const trace = Array.isArray(traceRes.trace) ? (traceRes.trace as WorkflowTraceStep[]) : [];
        const feedFromTrace = buildFeedFromTrace(trace, prompt);

        // Ensure a task_group entry exists when there are tasks
        const hasGroup = feedFromTrace.some((e) => e.kind === 'task_group');
        const feed =
          liveTasks.length > 0 && !hasGroup
            ? (() => {
                const promptIdx = feedFromTrace.findIndex((e) => e.kind === 'prompt');
                const insertAt = promptIdx >= 0 ? promptIdx + 1 : 0;
                return [
                  ...feedFromTrace.slice(0, insertAt),
                  { kind: 'task_group', taskId: 'tg:initial', tasks: [...liveTasks] } as FeedEntry,
                  ...feedFromTrace.slice(insertAt),
                ];
              })()
            : feedFromTrace;

        // If already terminal and no completion entry exists, add one.
        const withCompletion: FeedEntry[] = (() => {
          if (!isTerminal) return feed;
          if (feed.some((e) => e.kind === 'completion')) return feed;
          if (details.workflow.status === 'completed') {
            const output = details.workflow.output ?? undefined;
            if (!shouldAppendCompletionEntry(feed, output)) return feed;
            const completionEntry: FeedEntry = { kind: 'completion', output };
            return [...feed, completionEntry];
          }
          if (details.workflow.status === 'cancelled') {
            const cancelledEntry: FeedEntry = { kind: 'ai_message', text: 'Workflow cancelled' };
            return [...feed, cancelledEntry];
          }
          const failureReason = getHydratedFailureReason(details);
          const statusEntry: FeedEntry = {
            kind: 'ai_message',
            text: `Workflow failed: ${failureReason ?? 'No failure details from backend'}`,
          };
          return [...feed, statusEntry];
        })();

        setState((prev) => ({
          ...prev,
          feed: withCompletion,
          liveTasks,
          isTerminal,
          currentActivity: isTerminal ? 'Completed' : 'Executing…',
        }));

        if (!isTerminal) {
          connect();
        }
      } catch {
        // ignore hydration errors
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [config, workflowId, isActive, objective, buildFeedFromTrace, connect]);

  const handleEvent = useCallback((event: WorkflowEvent) => {
    setState((prev) => {
      const seq = () => seqRef.current++;

      const updateGroups = (feed: FeedEntry[], liveTasks: LiveTask[]): FeedEntry[] =>
        feed.map((e) => (e.kind === 'task_group' ? { ...e, tasks: liveTasks } : e));

      switch (event.type) {
        case 'tasks_initialized': {
          const data = event.data as TasksInitializedData;
          let liveTasks = [...prev.liveTasks];
          (data.tasks ?? []).forEach((task: WorkflowTask) => {
            liveTasks = upsertTask(liveTasks, {
              id: task.id,
              description: task.description,
              agent_type: task.agent_type,
              status: 'pending',
              tool_calls: 0,
            });
          });

          // Replace or add task_group feed entry
          const groupEntry: FeedEntry = { kind: 'task_group', taskId: `tg:${seq()}`, tasks: [...liveTasks] };
          const feedWithoutGroup = prev.feed.filter((e) => e.kind !== 'task_group' || (e as { taskId: string }).taskId === 'initial');
          const feed = [...feedWithoutGroup.filter((e) => e.kind !== 'task_group'), groupEntry];

          return { ...prev, liveTasks, feed, currentActivity: 'Planning complete, starting tasks…' };
        }

        case 'task_added': {
          const data = event.data as TaskAddedData;
          const taskId = event.task_id;
          if (!taskId) return prev;
          const description = data.display_description ?? data.description;
          const liveTasks = upsertTask(prev.liveTasks, {
            id: taskId,
            description,
            agent_type: data.agent_type,
            status: 'pending',
            tool_calls: 0,
          });
          const feed = updateGroups(prev.feed, liveTasks);
          return { ...prev, liveTasks, feed, isTerminal: false };
        }

        case 'task_dispatched': {
          const taskId = event.task_id;
          if (!taskId) return prev;
          const existing = prev.liveTasks.find((t) => t.id === taskId);
          const liveTasks = existing
            ? prev.liveTasks
            : upsertTask(prev.liveTasks, {
                id: taskId,
                description: 'Task',
                agent_type: 'task',
                status: 'pending',
                tool_calls: 0,
              });
          const feed = updateGroups(prev.feed, liveTasks);
          return { ...prev, liveTasks, feed, isTerminal: false };
        }

        case 'task_started': {
          const data = event.data as TaskStartedData;
          const taskId = event.task_id;
          if (!taskId) return prev;

          if (data.type === 'heartbeat') {
            const existing = prev.liveTasks.find((t) => t.id === taskId);
            const liveTasks = existing
              ? upsertTask(prev.liveTasks, {
                  ...existing,
                  current_activity:
                    typeof data.elapsed_s === 'number' && typeof data.timeout_s === 'number'
                      ? `Running… ${data.elapsed_s}s / ${data.timeout_s}s`
                      : 'Running…',
                })
              : prev.liveTasks;
            const feed = updateGroups(prev.feed, liveTasks);
            return { ...prev, liveTasks, feed, isTerminal: false };
          }

          const description = data.display_description ?? data.description;
          const agentType = data.agent_type ?? data.task_type ?? 'task';
          const existing = prev.liveTasks.find((t) => t.id === taskId);
          const liveTasks = upsertTask(prev.liveTasks, {
            id: taskId,
            description,
            agent_type: agentType,
            status: 'running',
            current_activity: description,
            tool_calls: existing?.tool_calls ?? 0,
          });
          const feed = updateGroups(prev.feed, liveTasks);
          return { ...prev, liveTasks, feed, currentActivity: description, isTerminal: false };
        }

        case 'task_completed': {
          const taskId = event.task_id;
          if (!taskId) return prev;
          const existing = prev.liveTasks.find((t) => t.id === taskId);
          const liveTasks = upsertTask(prev.liveTasks, {
            id: taskId,
            description: existing?.description ?? 'Task',
            agent_type: existing?.agent_type ?? 'task',
            status: 'completed',
            tool_calls: existing?.tool_calls ?? 0,
          });
          const feed = updateGroups(prev.feed, liveTasks);
          return { ...prev, liveTasks, feed, isTerminal: false };
        }

        case 'task_failed': {
          const taskId = event.task_id;
          if (!taskId) return prev;
          const existing = prev.liveTasks.find((t) => t.id === taskId);
          const liveTasks = upsertTask(prev.liveTasks, {
            id: taskId,
            description: existing?.description ?? 'Task',
            agent_type: existing?.agent_type ?? 'task',
            status: 'failed',
            tool_calls: existing?.tool_calls ?? 0,
          });
          const feed = updateGroups(prev.feed, liveTasks);
          return { ...prev, liveTasks, feed, isTerminal: false };
        }

        case 'task_skipped': {
          const taskId = event.task_id;
          if (!taskId) return prev;
          const existing = prev.liveTasks.find((t) => t.id === taskId);
          const liveTasks = upsertTask(prev.liveTasks, {
            id: taskId,
            description: existing?.description ?? 'Task',
            agent_type: existing?.agent_type ?? 'task',
            status: 'skipped',
            tool_calls: existing?.tool_calls ?? 0,
          });
          const feed = updateGroups(prev.feed, liveTasks);
          return { ...prev, liveTasks, feed, isTerminal: false };
        }

        case 'tool_call': {
          const data = event.data as ToolEventData;
          const taskId = 'orchestrator';
          const id = `tc:${taskId}:${seq()}`;
          const toolEntry: FeedEntry = {
            kind: 'tool_call',
            id,
            toolName: data.tool_name ?? 'tool',
            input: data.tool_input,
            taskId,
            status: 'running',
            at: event.timestamp,
          };
          return { ...prev, feed: [...prev.feed, toolEntry], currentActivity: data.tool_name ?? 'tool', isTerminal: false };
        }

        case 'tool_result': {
          const data = event.data as ToolEventData;
          const taskId = 'orchestrator';
          let marked = false;
          const feed = [...prev.feed]
            .reverse()
            .map((e) => {
              if (!marked && e.kind === 'tool_call' && e.taskId === taskId && e.status === 'running') {
                marked = true;
                return { ...e, status: 'done' as const, output: data.tool_output };
              }
              return e;
            })
            .reverse();
          return { ...prev, feed, isTerminal: false };
        }

        case 'subagent_tool_call': {
          const data = event.data as ToolEventData;
          const taskId = event.task_id ?? 'unknown';
          const id = `tc:${taskId}:${seq()}`;
          const toolEntry: FeedEntry = {
            kind: 'tool_call',
            id,
            toolName: data.tool_name ?? 'tool',
            input: data.tool_input,
            taskId,
            status: 'running',
            at: event.timestamp,
          };
          // Increment tool_calls on live task
          const liveTasks = prev.liveTasks.map((t) =>
            t.id === taskId ? { ...t, tool_calls: t.tool_calls + 1 } : t
          );
          const feed = updateGroups([...prev.feed, toolEntry], liveTasks);
          return { ...prev, feed, liveTasks, currentActivity: data.tool_name ?? 'tool', isTerminal: false };
        }

        case 'subagent_tool_result': {
          const taskId = event.task_id ?? 'unknown';
          const data = event.data as ToolEventData;
          // Mark the most recent running tool_call for this task as done
          let marked = false;
          const feed = [...prev.feed].reverse().map((e) => {
            if (!marked && e.kind === 'tool_call' && e.taskId === taskId && e.status === 'running') {
              marked = true;
              return { ...e, status: 'done' as const, output: data.tool_output };
            }
            return e;
          }).reverse();
          return { ...prev, feed, isTerminal: false };
        }

        case 'orchestrator_thinking': {
          return { ...prev, currentActivity: 'Thinking…', isTerminal: false };
        }

        case 'bash_approval_requested': {
          const data = event.data as {
            id?: string;
            tool_name?: string;
            command?: string;
            reason?: string;
            command_key?: string;
            subagent_id?: string;
          };

          const approvalId = typeof data.id === 'string' ? data.id : `approval:${seq()}`;
          const entry: FeedEntry = {
            kind: 'bash_approval',
            id: approvalId,
            taskId: typeof event.task_id === 'string' ? event.task_id : undefined,
            toolName: data.tool_name ?? 'bash',
            command: data.command ?? '',
            reason: data.reason,
            commandKey: data.command_key,
            status: 'pending',
          };

          return {
            ...prev,
            feed: [...prev.feed, entry],
            currentActivity: 'Approval required',
            isTerminal: false,
          };
        }

        case 'workflow_completed': {
          const data = event.data as WorkflowCompletedData;
          // Remove any trailing planning entries
          const feed = prev.feed.filter((e) => e.kind !== 'planning');
          const output = data.output;
          const completionEntry: FeedEntry = { kind: 'completion', output };
          const nextFeed: FeedEntry[] = shouldAppendCompletionEntry(feed, output)
            ? [...feed, completionEntry]
            : feed;
          return {
            ...prev,
            feed: nextFeed,
            isTerminal: true,
            currentActivity: 'Completed',
          };
        }

        case 'workflow_failed': {
          const data = event.data as WorkflowFailedData;
          const feed = prev.feed.filter((e) => e.kind !== 'planning');
          const errorText =
            typeof data.error === 'string' && data.error.trim().length > 0
              ? data.error.trim()
              : 'No failure details from backend';
          return {
            ...prev,
            feed: [...feed, { kind: 'ai_message', text: `Workflow failed: ${errorText}` }],
            isTerminal: true,
            currentActivity: 'Failed',
            error: data.error,
          };
        }

        default:
          return prev;
      }
    });
  }, []);

  handleEventRef.current = handleEvent;

  useEffect(() => {
    return () => {
      connectionRef.current?.close();
      connectionRef.current = null;
    };
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const msg = text.trim();
      if (!msg) return;

      setState((prev) => ({
        ...prev,
        feed: [...prev.feed, { kind: 'user_message', text: msg }],
        isTerminal: false,
        currentActivity: 'Continuing…',
      }));

      await continueWorkflow(config, workflowId, msg);

      // The SSE stream ends after completion/failure. Restart on continuation.
      connect();
    },
    [config, workflowId, connect]
  );

  return { ...state, sendMessage };
}
