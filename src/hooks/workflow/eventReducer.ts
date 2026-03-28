import { humanizeError } from '../../lib/humanizeError';
import type {
  WorkflowEvent,
  ToolEventData,
  WorkflowCompletedData,
  WorkflowFailedData,
  ClarificationRequestedData,
  FeedEntry,
} from '../../api/types';
import type { WorkflowStreamState } from './types';
import { isInternalPlannerTool, isInternalCapabilityDump, isEnvironmentSetupTool } from './filters';
import { formatToolActivity, appendRecentToolCalls } from './formatters';
import { shouldAppendCompletionEntry } from './feedHelpers';
import { buildPendingClarificationFromEvent } from './clarification';
import type { EventReducerContext } from './feedMutations';
import { appendEnvironmentReadyIfPending, upsertActiveTaskGroup } from './feedMutations';
import {
  handleTasksInitialized,
  handleTaskAdded,
  handleTaskDispatched,
  handleTaskStarted,
  handleTaskCompleted,
  handleTaskFailed,
  handleTaskSkipped,
} from './taskEventHandlers';

export type { EventReducerContext } from './feedMutations';

// ── reducer ─────────────────────────────────────────────────────────────

export function reduceWorkflowEvent(
  prev: WorkflowStreamState,
  event: WorkflowEvent,
  ctx: EventReducerContext,
): WorkflowStreamState {
  // Clear thinking text when transitioning away from thinking
  const clearThinking = event.type !== 'orchestrator_thinking' && prev.thinkingText ? '' : prev.thinkingText;
  const result = _reduceWorkflowEvent(prev, event, ctx);
  return result === prev ? result : { ...result, thinkingText: event.type === 'orchestrator_thinking' ? result.thinkingText : clearThinking };
}

function _reduceWorkflowEvent(
  prev: WorkflowStreamState,
  event: WorkflowEvent,
  ctx: EventReducerContext,
): WorkflowStreamState {
  switch (event.type) {
    case 'tasks_initialized':
      return handleTasksInitialized(prev, event, ctx);

    case 'task_added':
      return handleTaskAdded(prev, event, ctx);

    case 'task_dispatched':
      return handleTaskDispatched(prev, event, ctx);

    case 'task_started':
      return handleTaskStarted(prev, event, ctx);

    case 'task_completed':
      return handleTaskCompleted(prev, event, ctx);

    case 'task_failed':
      return handleTaskFailed(prev, event, ctx);

    case 'task_skipped':
      return handleTaskSkipped(prev, event, ctx);

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
      const toolName = data.tool_name ?? 'tool';
      let marked = false;
      const feed = [...prev.feed]
        .reverse()
        .map((e) => {
          if (!marked && e.kind === 'tool_call' && e.taskId === taskId && e.status === 'running' && e.toolName === toolName) {
            marked = true;
            return { ...e, status: 'done' as const, output: data.tool_output };
          }
          return e;
        })
        .reverse();
      // Fallback: if no matching tool name found, mark any running tool call for this task
      if (!marked) {
        let fallbackMarked = false;
        const feedFallback = [...prev.feed]
          .reverse()
          .map((e) => {
            if (!fallbackMarked && e.kind === 'tool_call' && e.taskId === taskId && e.status === 'running') {
              fallbackMarked = true;
              return { ...e, status: 'done' as const, output: data.tool_output };
            }
            return e;
          })
          .reverse();
        if (fallbackMarked) {
          const withEnvironmentReady = isEnvironmentSetupTool(data.tool_name)
            ? appendEnvironmentReadyIfPending(feedFallback, ctx)
            : feedFallback;
          return { ...prev, feed: withEnvironmentReady, isTerminal: false, workflowStatus: 'executing' };
        }
      }
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
      const thinkingData = event.data as { thinking?: string } | undefined;
      return {
        ...prev,
        feed: appendEnvironmentReadyIfPending(prev.feed, ctx),
        currentActivity: 'Thinking…',
        thinkingText: thinkingData?.thinking ?? prev.thinkingText,
        isTerminal: false,
        workflowStatus: 'executing',
        pendingClarification: undefined,
      };
    }

    case 'clarification_requested': {
      const data = event.data as ClarificationRequestedData;
      const clarification = buildPendingClarificationFromEvent(data);
      if (!clarification) return prev;

      // Don't add clarification to feed - it's shown in the panel above chat input
      const feed = appendEnvironmentReadyIfPending(prev.feed, ctx);

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
      // Remove planning entries and finalize any still-running tool calls
      const feed = prev.feed
        .filter((e) => e.kind !== 'planning')
        .map((e) => (e.kind === 'tool_call' && e.status === 'running' ? { ...e, status: 'done' as const } : e));
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
      // Remove planning entries and mark any still-running tool calls as failed
      const feed = prev.feed
        .filter((e) => e.kind !== 'planning')
        .map((e) => (e.kind === 'tool_call' && e.status === 'running' ? { ...e, status: 'failed' as const } : e));
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
