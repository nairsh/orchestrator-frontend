import { Tag, Tooltip } from '@lobehub/ui';
import type { LiveTask } from '../../api/types';
import { agentDisplayName } from '../tasks/feed/feedHelpers';

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
  if (status === 'completed' || status === 'skipped') return 'text-success';
  if (status === 'failed' || status === 'cancelled') return 'text-danger';
  if (status === 'running') return 'text-info animate-pulse';
  return 'text-placeholder';
};

const agentTagColor = (agentType: string): string => {
  switch (agentType) {
    case 'research': return 'blue';
    case 'code': return 'green';
    case 'analysis': return 'purple';
    default: return 'default';
  }
};

export function TaskGroupBlock({ tasks }: TaskGroupBlockProps) {
  if (tasks.length === 0) return null;

  const runningCount = tasks.filter((t) => t.status === 'running').length;
  const doneCount = tasks.filter((t) => t.status === 'completed' || t.status === 'skipped').length;

  return (
    <div className="rounded-xl border border-border-light bg-surface-secondary overflow-hidden my-1.5">
      <div className="px-3.5 py-2.5 border-b border-border-light">
        <div className="text-xs font-semibold text-primary">Running tasks in parallel</div>
        <div className="text-xs text-muted mt-0.5">
          {doneCount}/{tasks.length} complete
          {runningCount > 0 && ` · ${runningCount} running`}
        </div>
      </div>
      <div className="px-3.5 py-2 space-y-1.5">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-start gap-2.5 text-sm">
            <Tooltip title={task.status}>
              <span className={`font-mono text-xs mt-0.5 flex-shrink-0 ${statusClass(task.status)}`}>
                {statusIcon(task.status)}
              </span>
            </Tooltip>
            <div className="flex-1 min-w-0">
              <div className="text-primary text-xs leading-relaxed">{task.description}</div>
              {task.agent_type && task.agent_type !== 'task' && (
                <Tag color={agentTagColor(task.agent_type)} size="small" className="mt-0.5">
                  {agentDisplayName(task.agent_type)}
                </Tag>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
