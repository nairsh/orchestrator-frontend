import { useMemo } from 'react';
import { CheckCircle2, Loader2, Circle, XCircle, Clock } from 'lucide-react';
import { Tooltip } from '@lobehub/ui';
import type { LiveTask } from '../api/types';

interface WorkflowProgressProps {
  tasks: LiveTask[];
  isTerminal: boolean;
  className?: string;
}

const AGENT_COLORS: Record<string, string> = {
  research: 'bg-blue-500',
  analyze: 'bg-purple-500',
  write: 'bg-green-500',
  code: 'bg-orange-500',
  file: 'bg-gray-500',
  deep_research: 'bg-cyan-500',
};

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed': return <CheckCircle2 size={14} className="text-success" />;
    case 'running': return <Loader2 size={14} className="text-info animate-spin" />;
    case 'failed': return <XCircle size={14} className="text-danger" />;
    case 'blocked': return <Clock size={14} className="text-warning" />;
    default: return <Circle size={14} className="text-muted" />;
  }
}

export function WorkflowProgress({ tasks, isTerminal, className = '' }: WorkflowProgressProps) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const running = tasks.filter((t) => t.status === 'running').length;
    const failed = tasks.filter((t) => t.status === 'failed').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, running, failed, percentage };
  }, [tasks]);

  if (tasks.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-surface-tertiary overflow-hidden">
          <div
            className="h-full rounded-full bg-info transition-all duration-500 ease-out"
            style={{ width: `${isTerminal ? 100 : stats.percentage}%` }}
          />
        </div>
        <span className="text-xs font-mono text-muted w-8 text-right">
          {isTerminal ? '100' : stats.percentage}%
        </span>
      </div>

      {/* Task pills */}
      <div className="flex flex-wrap gap-1.5">
        {tasks.map((task) => (
          <Tooltip key={task.id} title={task.description}>
            <div
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-secondary/80 border border-border-light/50"
            >
              <StatusIcon status={task.status} />
              <div className={`w-1.5 h-1.5 rounded-full ${AGENT_COLORS[task.agent_type] ?? 'bg-muted'}`} />
              <span className="text-2xs text-secondary truncate max-w-[120px]">
                {task.description.length > 30 ? task.description.slice(0, 30) + '…' : task.description}
              </span>
            </div>
          </Tooltip>
        ))}
      </div>

      {/* Summary line */}
      <div className="flex items-center gap-3 text-2xs text-muted">
        <span>{stats.completed}/{stats.total} tasks complete</span>
        {stats.running > 0 && <span>• {stats.running} running</span>}
        {stats.failed > 0 && <span className="text-danger">• {stats.failed} failed</span>}
      </div>
    </div>
  );
}
