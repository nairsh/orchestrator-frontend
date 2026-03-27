import type { TaskStatus, TaskStartedData, LiveTask, WorkflowTraceStep } from '../../api/types';

export const normalizeTaskStatus = (status: string): TaskStatus => {
  const valid = ['pending', 'running', 'completed', 'failed', 'blocked', 'cancelled', 'skipped'];
  return valid.includes(status) ? (status as TaskStatus) : 'pending';
};

export const upsertTask = (tasks: LiveTask[], next: LiveTask): LiveTask[] => {
  const index = tasks.findIndex((t) => t.id === next.id);
  if (index < 0) return [...tasks, next];
  return tasks.map((t, i) => (i === index ? { ...t, ...next } : t));
};

export const resolveTaskModel = (data: TaskStartedData, existingModel?: string): string | undefined => {
  const dataRecord = data as unknown as Record<string, unknown>;
  const candidates = [data.model, dataRecord.model_name];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return existingModel;
};

export const deriveTaskModelByIdFromTrace = (trace: WorkflowTraceStep[]): Record<string, string> => {
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
