import { useState } from 'react';
import { Repeat2, ChevronDown, Check, CircleAlert, Loader2 } from 'lucide-react';
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

export function FeedTaskGroup({
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
        <Repeat2 size={16} className="text-muted flex-shrink-0" />
        <span className="font-sans text-base text-muted">{headerLabel}</span>
        <ChevronDown
          size={15}
          className="text-placeholder transition-transform duration-slow ml-auto flex-shrink-0"
          style={{ transform: open ? 'none' : 'rotate(-90deg)' }}
        />
      </button>

      <div
        className="overflow-hidden transition-all duration-slow"
        style={{ maxHeight: open ? 1200 : 0, opacity: open ? 1 : 0 }}
      >
        <div className="flex flex-col gap-1 ml-6">
          {tasks.map((task) => {
            const status = normalizeStatus(task.status);
            const recentToolCalls = Array.isArray(task.recent_tool_calls) ? task.recent_tool_calls : [];
            const lastTool = recentToolCalls[recentToolCalls.length - 1];
            const Icon = lastTool ? toolIconForName(lastTool) : Repeat2;
            const activity = taskActivityLabel(task);

            return (
              <div key={task.id} className="flex items-center gap-2 py-1 min-w-0">
                <Icon size={15} className="flex-shrink-0 text-muted" />
                <span className={`font-sans text-sm truncate ${status === 'running' ? 'text-primary' : 'text-muted'}`}>
                  {task.description || activity}
                </span>
                {status === 'running' && <Loader2 size={13} className="flex-shrink-0 text-muted animate-spin ml-auto" />}
                {(status === 'completed' || status === 'skipped') && <Check size={13} className="flex-shrink-0 text-muted ml-auto" />}
                {status === 'failed' && <CircleAlert size={13} className="flex-shrink-0 text-warning ml-auto" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
