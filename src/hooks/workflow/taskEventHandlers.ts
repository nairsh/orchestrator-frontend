import type {
  WorkflowEvent,
  WorkflowTask,
  TaskStartedData,
  TaskAddedData,
  TasksInitializedData,
  FeedEntry,
} from '../../api/types';
import type { WorkflowStreamState } from './types';
import { normalizeTaskStatus, upsertTask, resolveTaskModel } from './taskHelpers';
import type { EventReducerContext } from './feedMutations';
import { appendEnvironmentReadyIfPending, upsertActiveTaskGroup } from './feedMutations';

export function handleTasksInitialized(
  prev: WorkflowStreamState,
  event: WorkflowEvent,
  ctx: EventReducerContext,
): WorkflowStreamState {
  const data = event.data as TasksInitializedData;
  let liveTasks = prev.liveTasks.slice();
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

export function handleTaskAdded(
  prev: WorkflowStreamState,
  event: WorkflowEvent,
  ctx: EventReducerContext,
): WorkflowStreamState {
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

export function handleTaskDispatched(
  prev: WorkflowStreamState,
  event: WorkflowEvent,
  ctx: EventReducerContext,
): WorkflowStreamState {
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

export function handleTaskStarted(
  prev: WorkflowStreamState,
  event: WorkflowEvent,
  ctx: EventReducerContext,
): WorkflowStreamState {
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

export function handleTaskCompleted(
  prev: WorkflowStreamState,
  event: WorkflowEvent,
  ctx: EventReducerContext,
): WorkflowStreamState {
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

export function handleTaskFailed(
  prev: WorkflowStreamState,
  event: WorkflowEvent,
  ctx: EventReducerContext,
): WorkflowStreamState {
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

export function handleTaskSkipped(
  prev: WorkflowStreamState,
  event: WorkflowEvent,
  ctx: EventReducerContext,
): WorkflowStreamState {
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
