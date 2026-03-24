import type { LiveTask } from '../../api/types';

interface TaskGroupBlockProps {
  tasks: LiveTask[];
}

const statusIcon = (status: string) => {
  if (status === 'completed' || status === 'skipped') return '✓';
  if (status === 'failed' || status === 'cancelled') return '✕';
  if (status === 'running') return '●';
  return '○';
};

const statusClass = (status: string) => {
  if (status === 'completed' || status === 'skipped') return 'text-green-600';
  if (status === 'failed' || status === 'cancelled') return 'text-red-500';
  if (status === 'running') return 'text-blue-500 animate-pulse';
  return 'text-placeholder';
};

export function TaskGroupBlock({ tasks }: TaskGroupBlockProps) {
  if (tasks.length === 0) return null;

  const runningCount = tasks.filter((t) => t.status === 'running').length;
  const doneCount = tasks.filter((t) => t.status === 'completed' || t.status === 'skipped').length;

  return (
    <div className="rounded-xl border border-border bg-surface-secondary overflow-hidden my-1.5">
      <div className="px-3.5 py-2.5 border-b border-border">
        <div className="text-xs font-semibold text-primary">Running tasks in parallel</div>
        <div className="text-xs text-muted mt-0.5">
          {doneCount}/{tasks.length} complete
          {runningCount > 0 && ` · ${runningCount} running`}
        </div>
      </div>
      <div className="px-3.5 py-2 space-y-1.5">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-start gap-2.5 text-sm">
            <span className={`font-mono text-xs mt-0.5 flex-shrink-0 ${statusClass(task.status)}`}>
              {statusIcon(task.status)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-primary text-xs leading-relaxed">{task.description}</div>
              {task.agent_type && task.agent_type !== 'task' && (
                <div className="text-muted text-[10px] mt-0.5 capitalize">{task.agent_type} agent</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
