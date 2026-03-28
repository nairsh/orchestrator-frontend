import { memo, useState } from 'react';
import { GitFork, ChevronDown, Check, CircleAlert, Loader2 } from 'lucide-react';
import { normalizeStatus, taskActivityLabel, toolIconForName } from './feedHelpers';

interface Task {
  id: string;
  description: string;
  agent_type?: string;
  status: string;
  current_activity?: string;
  model?: string;
  recent_tool_calls?: string[];
  tool_calls?: number;
}

export const FeedTaskGroup = memo(function FeedTaskGroup({
  tasks,
}: {
  tasks: Task[];
}) {
  const [open, setOpen] = useState(true);
  const taskCount = tasks.length;
  const allCompleted = tasks.every((t) => normalizeStatus(t.status) === 'completed' || normalizeStatus(t.status) === 'skipped');
  const anyFailed = tasks.some((t) => normalizeStatus(t.status) === 'failed');
  const headerLabel = allCompleted
    ? (taskCount <= 1 ? 'Completed task' : 'Completed tasks')
    : anyFailed
      ? (taskCount <= 1 ? 'Task failed' : 'Some tasks failed')
      : (taskCount <= 1 ? 'Running task' : 'Running tasks in parallel');

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        className="flex items-center gap-2 bg-transparent border-none cursor-pointer p-0"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${headerLabel} — ${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}`}
      >
        <GitFork size={16} className="text-muted flex-shrink-0 -rotate-90" />
        <span className="font-sans text-base text-muted">{headerLabel}</span>
        <ChevronDown
          size={15}
          className="text-placeholder transition-transform duration-slow ml-auto flex-shrink-0"
          style={{ transform: open ? 'none' : 'rotate(-90deg)' }}
        />
      </button>

      <div
        className="overflow-hidden transition-all duration-slow"
        style={{ maxHeight: open ? 'none' : 0, opacity: open ? 1 : 0 }}
        aria-hidden={!open}
      >
        <div className="flex flex-col gap-1 ml-6 border-l border-border-subtle/60 pl-3">
          {tasks.map((task) => {
            const status = normalizeStatus(task.status);
            const recentToolCalls = Array.isArray(task.recent_tool_calls) ? task.recent_tool_calls : [];
            const lastTool = recentToolCalls[recentToolCalls.length - 1];
            const Icon = lastTool ? toolIconForName(lastTool) : GitFork;
            const activity = taskActivityLabel(task);

            return (
              <div key={task.id} className="flex items-center gap-2 py-1 min-w-0">
                <Icon size={15} className="flex-shrink-0 text-muted" aria-hidden="true" />
                <span className={`font-sans text-sm truncate ${status === 'running' ? 'text-primary' : 'text-muted'}`}>
                  {task.description || activity}
                </span>
                {status === 'running' && <Loader2 size={13} className="flex-shrink-0 text-muted animate-spin ml-auto" aria-label="Running" />}
                {(status === 'completed' || status === 'skipped') && <Check size={13} className="flex-shrink-0 text-muted ml-auto" aria-label="Completed" />}
                {status === 'failed' && <CircleAlert size={13} className="flex-shrink-0 text-danger ml-auto" aria-label="Failed" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});