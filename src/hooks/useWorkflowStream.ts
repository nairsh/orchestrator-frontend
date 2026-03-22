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

const internalPlannerToolLabels = new Set([
  'write_todo',
  'edit_todo',
  'list_todos',
  'spawn_subagent',
  'await_subagents',
]);

const isInternalPlannerTool = (toolName?: string): boolean => {
  const normalized = String(toolName ?? '').trim().toLowerCase();
  return internalPlannerToolLabels.has(normalized);
};

const isInternalCapabilityDump = (text?: string): boolean => {
  if (typeof text !== 'string') return false;
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;

  if (normalized.startsWith('i have access to the following tools')) return true;

  let markerCount = 0;
  const markers = [
    'web_search:',
    'fetch_url:',
    'bash:',
    'file_read:',
    'file_write:',
    'file_edit:',
    'grep:',
    'glob:',
    'run_skill:',
    'write_todo:',
    'edit_todo:',
    'list_todos:',
  ];

  for (const marker of markers) {
    if (normalized.includes(marker)) markerCount += 1;
    if (markerCount >= 4) return true;
  }

  return false;
};

const isInternalPlannerNoise = (text?: string): boolean => {
  if (typeof text !== 'string') return false;
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;

  if (normalized === 'running tasks in parallel') return true;
  if (normalized === 'task list') return true;

  return internalPlannerToolLabels.has(normalized);
};

const formatToolActivity = (toolName?: string): string => {
  const name = String(toolName ?? '').trim();
  if (!name) return 'Working…';
  if (name === 'bash') return 'Running command…';
  if (name === 'web_search') return 'Searching web…';
  if (name === 'fetch_url') return 'Reading URL…';
  if (name === 'file_read') return 'Reading file…';
  if (name === 'file_write') return 'Writing file…';
  if (name === 'file_edit') return 'Editing file…';
  if (name === 'glob') return 'Finding files…';
  if (name === 'grep') return 'Searching content…';
  if (name === 'spawn_subagent') return 'Starting sub-agent…';
  if (name === 'await_subagents') return 'Waiting for sub-agents…';
  if (name === 'write_todo' || name === 'edit_todo' || name === 'list_todos') return 'Updating task list…';
  return `${name.replace(/_/g, ' ')}…`;
};

const formatToolCallLabel = (toolName?: string): string => {
  const name = String(toolName ?? '').trim();
  if (!name) return 'tool';
  return name.replace(/_/g, ' ');
};

const isEnvironmentSetupTool = (toolName?: string): boolean => {
  const normalized = String(toolName ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return (
    normalized.includes('openterminal') ||
    normalized === 'startenvironment' ||
    normalized.includes('environmentsetup')
  );
};

const appendRecentToolCalls = (existing: string[] | undefined, toolName?: string): string[] => {
  const label = formatToolCallLabel(toolName);
  const prev = Array.isArray(existing) ? existing : [];
  return [...prev, label].slice(-3);
};

const resolveTaskModel = (data: TaskStartedData, existingModel?: string): string | undefined => {
  const dataRecord = data as unknown as Record<string, unknown>;
  const candidates = [data.model, dataRecord.model_name];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return existingModel;
};

const deriveTaskModelByIdFromTrace = (trace: WorkflowTraceStep[]): Record<string, string> => {
  const modelByTaskId: Record<string, string> = {};

  for (const step of trace) {
    const taskId = typeof step.subagent_id === 'string' ? step.subagent_id.trim() : '';
    if (!taskId || taskId === 'orchestrator') continue;

    const modelName = typeof step.model_name === 'string' ? step.model_name.trim() : '';
    if (!modelName) continue;

    modelByTaskId[taskId] = modelName;
  }

  return modelByTaskId;
};

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
  const pendingEnvironmentSetupRef = useRef(false);
  const handleEventRef = useRef<(event: WorkflowEvent) => void>(() => undefined);

  const connect = useCallback(() => {
    if (!isActive) return;
    if (!config.baseUrl) return;

    connectionRef.current?.close();
    connectionRef.current = connectWorkflowStream(
      {
        baseUrl: config.baseUrl,
        getAuthToken: config.getAuthToken,
      },
      workflowId,
      (event) => handleEventRef.current(event),
      (err) => {
        setState((prev) => ({ ...prev, currentActivity: `Stream error: ${err.message}` }));
      }
    );
  }, [config.baseUrl, config.getAuthToken, workflowId, isActive]);

  const buildFeedFromTrace = useCallback(
    (trace: WorkflowTraceStep[], prompt?: string, hydratedTasks: LiveTask[] = []): FeedEntry[] => {
      const feed: FeedEntry[] = [];
      if (prompt) feed.push({ kind: 'prompt', text: prompt });

      let taskGroupInserted = false;
      const ensureTraceTaskGroup = (seed: string) => {
        if (taskGroupInserted || hydratedTasks.length === 0) return;
        feed.push({ kind: 'task_group', taskId: `tg:trace:${seed}`, tasks: [...hydratedTasks] });
        taskGroupInserted = true;
      };

      for (const step of trace) {
        const taskId = step.subagent_id ?? 'orchestrator';

        if (
          step.step_type === 'subagent_spawn' ||
          step.step_type === 'subagent_message' ||
          step.step_type === 'subagent_tool_call' ||
          step.step_type === 'subagent_tool_result' ||
          (step.step_type === 'tool_call' && isInternalPlannerTool(step.tool_name ?? undefined))
        ) {
          ensureTraceTaskGroup(step.step_id);
        }

        if (step.step_type === 'orchestrator_message' && step.message_content) {
          const message = step.message_content.trim();
          if (!message) continue;
          if (/^workflow created:/i.test(message)) continue;
          if (isInternalCapabilityDump(message)) continue;
          if (isInternalPlannerNoise(message)) continue;
          feed.push({ kind: 'ai_message', text: message });
          continue;
        }

        if (step.step_type === 'subagent_tool_call' || step.step_type === 'subagent_tool_result') {
          continue;
        }

        if (step.step_type === 'tool_call') {
          if (!step.tool_name) continue;
          if (isEnvironmentSetupTool(step.tool_name)) {
            const last = feed[feed.length - 1];
            if (!(last?.kind === 'system_status' && last.text === 'Starting environment…')) {
              feed.push({ kind: 'system_status', text: 'Starting environment…' });
            }
            continue;
          }
          if (isInternalPlannerTool(step.tool_name)) continue;
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

        if (step.step_type === 'tool_result') {
          if (!step.tool_name) continue;
          if (isEnvironmentSetupTool(step.tool_name)) {
            const last = feed[feed.length - 1];
            if (!(last?.kind === 'system_status' && last.text === 'Environment started')) {
              feed.push({ kind: 'system_status', text: 'Environment started' });
            }
            continue;
          }
          if (isInternalPlannerTool(step.tool_name)) continue;
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

      if (!taskGroupInserted && hydratedTasks.length > 0) {
        feed.push({ kind: 'task_group', taskId: 'tg:trace:fallback', tasks: [...hydratedTasks] });
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
        const traceModelsByTaskId = deriveTaskModelByIdFromTrace(trace);

        liveTasks = liveTasks.map((task) => ({
          ...task,
          model: traceModelsByTaskId[task.id] ?? task.model,
        }));

        const feed = buildFeedFromTrace(trace, prompt, liveTasks);

        // If already terminal and no completion entry exists, add one.
        const withCompletion: FeedEntry[] = (() => {
          if (!isTerminal) return feed;
          if (feed.some((e) => e.kind === 'completion')) return feed;
          if (details.workflow.status === 'completed') {
            const output = isInternalCapabilityDump(details.workflow.output ?? undefined)
              ? undefined
              : details.workflow.output ?? undefined;
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

      const appendEnvironmentReadyIfPending = (feed: FeedEntry[]): FeedEntry[] => {
        if (!pendingEnvironmentSetupRef.current) return feed;
        pendingEnvironmentSetupRef.current = false;

        const last = feed[feed.length - 1];
        if (
          last?.kind === 'system_status' &&
          (last.text === 'Environment started' || last.text === 'Environment ready')
        ) {
          return feed;
        }

        return [...feed, { kind: 'system_status', text: 'Environment started' }];
      };

      const upsertActiveTaskGroup = (feed: FeedEntry[], liveTasks: LiveTask[]): FeedEntry[] => {
        let lastTaskGroupIndex = -1;
        let lastConversationIndex = -1;

        for (let i = feed.length - 1; i >= 0; i -= 1) {
          const entry = feed[i];
          if (lastTaskGroupIndex < 0 && entry.kind === 'task_group') {
            lastTaskGroupIndex = i;
          }
          if (lastConversationIndex < 0 && (entry.kind === 'prompt' || entry.kind === 'user_message')) {
            lastConversationIndex = i;
          }
          if (lastTaskGroupIndex >= 0 && lastConversationIndex >= 0) break;
        }

        if (lastTaskGroupIndex < 0 || lastTaskGroupIndex < lastConversationIndex) {
          const nextTaskGroup: FeedEntry = { kind: 'task_group', taskId: `tg:${seq()}`, tasks: [...liveTasks] };
          const terminalEntryIndex = feed.findIndex(
            (entry) =>
              entry.kind === 'completion' ||
              (entry.kind === 'ai_message' && /^workflow failed:/i.test(entry.text.trim()))
          );

          if (terminalEntryIndex >= 0) {
            return [...feed.slice(0, terminalEntryIndex), nextTaskGroup, ...feed.slice(terminalEntryIndex)];
          }

          return [...feed, nextTaskGroup];
        }

        return feed.map((entry, idx) =>
          idx === lastTaskGroupIndex && entry.kind === 'task_group'
            ? { ...entry, tasks: [...liveTasks] }
            : entry
        );
      };

      switch (event.type) {
        case 'tasks_initialized': {
          const data = event.data as TasksInitializedData;
          let liveTasks: LiveTask[] = [];
          (data.tasks ?? []).forEach((task: WorkflowTask) => {
            const existing = prev.liveTasks.find((t) => t.id === task.id);
            liveTasks = upsertTask(liveTasks, {
              id: task.id,
              description: task.description,
              agent_type: task.agent_type,
              status: normalizeTaskStatus(task.status),
              current_activity: existing?.current_activity,
              model: existing?.model,
              recent_tool_calls: existing?.recent_tool_calls,
              tool_calls: existing?.tool_calls ?? 0,
            });
          });

          const feed = upsertActiveTaskGroup(prev.feed, liveTasks);

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
          const feed = upsertActiveTaskGroup(prev.feed, liveTasks);
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
          const feed = upsertActiveTaskGroup(prev.feed, liveTasks);
          return { ...prev, liveTasks, feed, isTerminal: false };
        }

        case 'task_started': {
          const data = event.data as TaskStartedData;
          const taskId = event.task_id;
          if (!taskId) return prev;

          const appendStatusDot = (feed: FeedEntry[], text: string): FeedEntry[] => {
            const last = feed[feed.length - 1];
            if (last?.kind === 'system_status' && last.text === text) return feed;
            return [...feed, { kind: 'system_status', text } as FeedEntry];
          };

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
            const feed = upsertActiveTaskGroup(prev.feed, liveTasks);
            return { ...prev, liveTasks, feed, isTerminal: false };
          }

          if (data.type === 'environment') {
            const existing = prev.liveTasks.find((t) => t.id === taskId);
            const activity = data.display_description ?? data.description ?? 'Environment update';
            const isReadyState = /\b(ready|started)\b/i.test(activity);
            const statusText = isReadyState ? 'Environment started' : 'Starting environment…';

            if (isReadyState) {
              pendingEnvironmentSetupRef.current = false;
            } else {
              pendingEnvironmentSetupRef.current = true;
            }

            const liveTasks = upsertTask(prev.liveTasks, {
              id: taskId,
              description: existing?.description ?? 'Task',
              agent_type: existing?.agent_type ?? data.agent_type ?? data.task_type ?? 'task',
              status:
                existing?.status === 'completed' ||
                existing?.status === 'failed' ||
                existing?.status === 'skipped' ||
                existing?.status === 'cancelled'
                  ? existing.status
                  : 'running',
              current_activity: activity,
              model: resolveTaskModel(data, existing?.model),
              recent_tool_calls: existing?.recent_tool_calls,
              tool_calls: existing?.tool_calls ?? 0,
            });

            const withStatus = appendStatusDot(prev.feed, statusText);
            const feed = upsertActiveTaskGroup(withStatus, liveTasks);
            return {
              ...prev,
              liveTasks,
              feed,
              currentActivity: activity,
              isTerminal: false,
            };
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
            model: resolveTaskModel(data, existing?.model),
            tool_calls: existing?.tool_calls ?? 0,
          });
          const feed = upsertActiveTaskGroup(prev.feed, liveTasks);
          return {
            ...prev,
            liveTasks,
            feed: appendEnvironmentReadyIfPending(feed),
            currentActivity: description,
            isTerminal: false,
          };
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
            current_activity: existing?.current_activity,
            model: existing?.model,
            tool_calls: existing?.tool_calls ?? 0,
          });
          const feed = upsertActiveTaskGroup(prev.feed, liveTasks);
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
            current_activity: existing?.current_activity,
            model: existing?.model,
            tool_calls: existing?.tool_calls ?? 0,
          });
          const feed = upsertActiveTaskGroup(prev.feed, liveTasks);
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
            current_activity: existing?.current_activity,
            model: existing?.model,
            tool_calls: existing?.tool_calls ?? 0,
          });
          const feed = upsertActiveTaskGroup(prev.feed, liveTasks);
          return { ...prev, liveTasks, feed, isTerminal: false };
        }

        case 'tool_call': {
          const data = event.data as ToolEventData;
          if (isEnvironmentSetupTool(data.tool_name)) {
            const last = prev.feed[prev.feed.length - 1];
            const nextFeed: FeedEntry[] =
              last?.kind === 'system_status' && last.text === 'Starting environment…'
                ? prev.feed
                : [...prev.feed, { kind: 'system_status', text: 'Starting environment…' } as FeedEntry];
            return {
              ...prev,
              feed: nextFeed,
              currentActivity: 'Starting environment…',
              isTerminal: false,
            };
          }
          if (isInternalPlannerTool(data.tool_name)) {
            return { ...prev, isTerminal: false };
          }
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
          const withEnvironmentReady = isEnvironmentSetupTool(data.tool_name)
            ? prev.feed
            : appendEnvironmentReadyIfPending(prev.feed);
          return {
            ...prev,
            feed: [...withEnvironmentReady, toolEntry],
            currentActivity: data.tool_name ?? 'tool',
            isTerminal: false,
          };
        }

        case 'tool_result': {
          const data = event.data as ToolEventData;
          if (isEnvironmentSetupTool(data.tool_name)) {
            pendingEnvironmentSetupRef.current = false;
            const last = prev.feed[prev.feed.length - 1];
            const nextFeed: FeedEntry[] =
              last?.kind === 'system_status' && last.text === 'Environment started'
                ? prev.feed
                : [...prev.feed, { kind: 'system_status', text: 'Environment started' } as FeedEntry];
            return {
              ...prev,
              feed: nextFeed,
              currentActivity: 'Environment started',
              isTerminal: false,
            };
          }
          if (isInternalPlannerTool(data.tool_name)) {
            return { ...prev, isTerminal: false };
          }
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
          const withEnvironmentReady = isEnvironmentSetupTool(data.tool_name)
            ? appendEnvironmentReadyIfPending(feed)
            : feed;
          return { ...prev, feed: withEnvironmentReady, isTerminal: false };
        }

        case 'subagent_tool_call': {
          const data = event.data as ToolEventData;
          const taskId = event.task_id ?? 'unknown';

          const liveTasks = prev.liveTasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  tool_calls: t.tool_calls + 1,
                  current_activity: formatToolActivity(data.tool_name),
                  recent_tool_calls: appendRecentToolCalls(t.recent_tool_calls, data.tool_name),
                }
              : t
          );

          const feed = upsertActiveTaskGroup(prev.feed, liveTasks);
          return {
            ...prev,
            feed: appendEnvironmentReadyIfPending(feed),
            liveTasks,
            currentActivity: formatToolActivity(data.tool_name),
            isTerminal: false,
          };
        }

        case 'subagent_tool_result': {
          const feed = upsertActiveTaskGroup(prev.feed, prev.liveTasks);
          return { ...prev, feed: appendEnvironmentReadyIfPending(feed), isTerminal: false };
        }

        case 'orchestrator_thinking': {
          return {
            ...prev,
            feed: appendEnvironmentReadyIfPending(prev.feed),
            currentActivity: 'Thinking…',
            isTerminal: false,
          };
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
          pendingEnvironmentSetupRef.current = false;
          // Remove any trailing planning entries
          const feed = prev.feed.filter((e) => e.kind !== 'planning');
          const output = isInternalCapabilityDump(data.output) ? undefined : data.output;
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
          pendingEnvironmentSetupRef.current = false;
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

      pendingEnvironmentSetupRef.current = true;

      setState((prev) => ({
        ...prev,
        feed: [...prev.feed, { kind: 'user_message', text: msg }, { kind: 'system_status', text: 'Starting environment…' }],
        liveTasks: [],
        isTerminal: false,
        currentActivity: 'Starting environment…',
      }));

      try {
        await continueWorkflow(
          config,
          workflowId,
          msg
        );
      } catch (error) {
        pendingEnvironmentSetupRef.current = false;
        throw error;
      }

      // The SSE stream ends after completion/failure. Restart on continuation.
      connect();
    },
    [config, workflowId, connect]
  );

  return { ...state, sendMessage };
}
