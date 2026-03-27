import { humanizeError } from '../../lib/humanizeError';
import type {
  WorkflowEvent,
  WorkflowTask,
  TaskStartedData,
  TaskAddedData,
  ToolEventData,
  TasksInitializedData,
  WorkflowCompletedData,
  WorkflowFailedData,
  ClarificationRequestedData,
  FeedEntry,
  LiveTask,
} from '../../api/types';
import type { WorkflowStreamState } from './types';
import { isInternalPlannerTool, isInternalCapabilityDump, isEnvironmentSetupTool } from './filters';
import { formatToolActivity, appendRecentToolCalls } from './formatters';
import { normalizeTaskStatus, upsertTask, resolveTaskModel } from './taskHelpers';
import { shouldAppendCompletionEntry } from './feedHelpers';
import { buildPendingClarificationFromEvent } from './clarification';

/** Mutable context passed into the reducer so the caller can read back side-effects. */
export interface EventReducerContext {
  seq: () => number;
  pendingEnvironmentSetup: boolean;
}

// ── internal helpers ────────────────────────────────────────────────────

const appendEnvironmentReadyIfPending = (feed: FeedEntry[], ctx: EventReducerContext): FeedEntry[] => {
  if (!ctx.pendingEnvironmentSetup) return feed;
  ctx.pendingEnvironmentSetup = false;

  const last = feed[feed.length - 1];
  if (
    last?.kind === 'system_status' &&
    (last.text === 'Environment started' || last.text === 'Environment ready')
  ) {
    return feed;
  }

  return [...feed, { kind: 'system_status', text: 'Environment started' }];
};

const upsertActiveTaskGroup = (
  feed: FeedEntry[],
  liveTasks: LiveTask[],
  ctx: EventReducerContext,
): FeedEntry[] => {
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
    const nextTaskGroup: FeedEntry = { kind: 'task_group', taskId: `tg:${ctx.seq()}`, tasks: [...liveTasks] };
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

const upsertClarificationToolCall = (
  feed: FeedEntry[],
  data: ClarificationRequestedData,
  ctx: EventReducerContext,
  timestamp?: string,
): FeedEntry[] => {
  const clarificationOutput = {
    clarification_question: data.question,
    options: data.options,
    allow_custom: data.allow_custom,
  };

  let updated = false;
  const nextFeed = [...feed]
    .reverse()
    .map((entry) => {
      if (
        !updated &&
        entry.kind === 'tool_call' &&
        entry.toolName === 'request_clarification' &&
        entry.status === 'running'
      ) {
        updated = true;
        return {
          ...entry,
          status: 'done' as const,
          output: clarificationOutput,
        };
      }
      return entry;
    })
    .reverse();

  if (updated) return nextFeed;

  return [
    ...nextFeed,
    {
      kind: 'tool_call',
      id: `tc:clarification:${ctx.seq()}`,
      toolName: 'request_clarification',
      input: {
        question: data.question,
        options: data.options,
        allow_custom: data.allow_custom,
      },
      output: clarificationOutput,
      taskId: 'orchestrator',
      status: 'done',
      at: timestamp,
    } satisfies FeedEntry,
  ];
};

// ── reducer ─────────────────────────────────────────────────────────────

export function reduceWorkflowEvent(
  prev: WorkflowStreamState,
  event: WorkflowEvent,
  ctx: EventReducerContext,
): WorkflowStreamState {
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

      const feed = upsertActiveTaskGroup(prev.feed, liveTasks, ctx);

      return {
        ...prev,
        liveTasks,
        feed,
        currentActivity: 'Planning complete, starting tasks…',
        workflowStatus: 'executing',
        pendingClarification: undefined,
      };
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
      const feed = upsertActiveTaskGroup(prev.feed, liveTasks, ctx);
      return { ...prev, liveTasks, feed, isTerminal: false, workflowStatus: 'executing', pendingClarification: undefined };
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
      const feed = upsertActiveTaskGroup(prev.feed, liveTasks, ctx);
      return { ...prev, liveTasks, feed, isTerminal: false, workflowStatus: 'executing', pendingClarification: undefined };
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
        const feed = upsertActiveTaskGroup(prev.feed, liveTasks, ctx);
        return { ...prev, liveTasks, feed, isTerminal: false, workflowStatus: 'executing', pendingClarification: undefined };
      }

      if (data.type === 'environment') {
        const existing = prev.liveTasks.find((t) => t.id === taskId);
        const activity = data.display_description ?? data.description ?? 'Environment update';
        const isReadyState = /\b(ready|started)\b/i.test(activity);
        const statusText = isReadyState ? 'Environment started' : 'Starting environment…';

        if (isReadyState) {
          ctx.pendingEnvironmentSetup = false;
        } else {
          ctx.pendingEnvironmentSetup = true;
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
        const feed = upsertActiveTaskGroup(withStatus, liveTasks, ctx);
        return {
          ...prev,
          liveTasks,
          feed,
          currentActivity: activity,
          isTerminal: false,
          workflowStatus: 'executing',
          pendingClarification: undefined,
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
      const feed = upsertActiveTaskGroup(prev.feed, liveTasks, ctx);
      return {
        ...prev,
        liveTasks,
        feed: appendEnvironmentReadyIfPending(feed, ctx),
        currentActivity: description,
        isTerminal: false,
        workflowStatus: 'executing',
        pendingClarification: undefined,
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
      const feed = upsertActiveTaskGroup(prev.feed, liveTasks, ctx);
      return { ...prev, liveTasks, feed, isTerminal: false, workflowStatus: 'executing' };
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
      const feed = upsertActiveTaskGroup(prev.feed, liveTasks, ctx);
      return { ...prev, liveTasks, feed, isTerminal: false, workflowStatus: 'executing' };
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
      const feed = upsertActiveTaskGroup(prev.feed, liveTasks, ctx);
      return { ...prev, liveTasks, feed, isTerminal: false, workflowStatus: 'executing' };
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
          workflowStatus: 'executing',
          pendingClarification: undefined,
        };
      }
      if (isInternalPlannerTool(data.tool_name)) {
        return { ...prev, isTerminal: false, workflowStatus: 'executing' };
      }
      const taskId = 'orchestrator';
      const id = `tc:${taskId}:${ctx.seq()}`;
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
        : appendEnvironmentReadyIfPending(prev.feed, ctx);
      return {
        ...prev,
        feed: [...withEnvironmentReady, toolEntry],
        currentActivity: data.tool_name ?? 'tool',
        isTerminal: false,
        workflowStatus: 'executing',
        pendingClarification: undefined,
      };
    }

    case 'tool_result': {
      const data = event.data as ToolEventData;
      if (isEnvironmentSetupTool(data.tool_name)) {
        ctx.pendingEnvironmentSetup = false;
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
          workflowStatus: 'executing',
          pendingClarification: undefined,
        };
      }
      if (isInternalPlannerTool(data.tool_name)) {
        return { ...prev, isTerminal: false, workflowStatus: 'executing' };
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
        ? appendEnvironmentReadyIfPending(feed, ctx)
        : feed;
      return { ...prev, feed: withEnvironmentReady, isTerminal: false, workflowStatus: 'executing' };
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

      const feed = upsertActiveTaskGroup(prev.feed, liveTasks, ctx);
      return {
        ...prev,
        feed: appendEnvironmentReadyIfPending(feed, ctx),
        liveTasks,
        currentActivity: formatToolActivity(data.tool_name),
        isTerminal: false,
        workflowStatus: 'executing',
        pendingClarification: undefined,
      };
    }

    case 'subagent_tool_result': {
      const feed = upsertActiveTaskGroup(prev.feed, prev.liveTasks, ctx);
      return { ...prev, feed: appendEnvironmentReadyIfPending(feed, ctx), isTerminal: false, workflowStatus: 'executing' };
    }

    case 'orchestrator_thinking': {
      return {
        ...prev,
        feed: appendEnvironmentReadyIfPending(prev.feed, ctx),
        currentActivity: 'Thinking…',
        isTerminal: false,
        workflowStatus: 'executing',
        pendingClarification: undefined,
      };
    }

    case 'clarification_requested': {
      const data = event.data as ClarificationRequestedData;
      const clarification = buildPendingClarificationFromEvent(data);
      if (!clarification) return prev;

      const feed = upsertClarificationToolCall(appendEnvironmentReadyIfPending(prev.feed, ctx), data, ctx, event.timestamp);

      return {
        ...prev,
        feed,
        currentActivity: 'Waiting for your reply…',
        isTerminal: false,
        workflowStatus: 'paused',
        pendingClarification: clarification,
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

      const approvalId = typeof data.id === 'string' ? data.id : `approval:${ctx.seq()}`;
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
        workflowStatus: 'executing',
      };
    }

    case 'workflow_completed': {
      const data = event.data as WorkflowCompletedData;
      ctx.pendingEnvironmentSetup = false;
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
        workflowStatus: 'completed',
        pendingClarification: undefined,
      };
    }

    case 'workflow_failed': {
      const data = event.data as WorkflowFailedData;
      ctx.pendingEnvironmentSetup = false;
      const feed = prev.feed.filter((e) => e.kind !== 'planning');
      const rawError =
        typeof data.error === 'string' && data.error.trim().length > 0
          ? data.error.trim()
          : '';
      const errorText = humanizeError(rawError);
      return {
        ...prev,
        feed: [...feed, { kind: 'ai_message', text: `Workflow failed: ${errorText}` }],
        isTerminal: true,
        currentActivity: 'Failed',
        workflowStatus: 'failed',
        error: data.error,
        pendingClarification: undefined,
      };
    }

    default:
      return prev;
  }
}
