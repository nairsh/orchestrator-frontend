import type { FeedEntry, LiveTask, WorkflowTraceStep } from '../../api/types';
import type { WorkflowDetails } from '../../api/client';
import { isInternalPlannerTool, isInternalCapabilityDump, isInternalPlannerNoise, isEnvironmentSetupTool } from './filters';

export const normalizeComparableText = (text?: string): string =>
  (typeof text === 'string' ? text : '').trim().replace(/\s+/g, ' ');

export const shouldAppendCompletionEntry = (feed: FeedEntry[], output?: string): boolean => {
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

export function buildFeedFromTrace(
  trace: WorkflowTraceStep[],
  prompt?: string,
  hydratedTasks: LiveTask[] = [],
): FeedEntry[] {
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
}

export const getHydratedFailureReason = (details: WorkflowDetails): string | undefined => {
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
