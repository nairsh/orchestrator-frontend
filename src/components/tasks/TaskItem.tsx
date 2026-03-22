import { Check, ChevronRight } from 'lucide-react';
import type { WorkflowSummary } from '../../api/types';
import type { ApiConfig } from '../../api/client';
import { cancelWorkflow } from '../../api/client';
import { TaskContextMenu } from '../dropdowns/TaskContextMenu';
import { toastApiError, toastInfo, toastSuccess } from '../../lib/toast';
import { parseApiTimestampMs } from '../../lib/time';

interface TaskItemProps {
  workflow: WorkflowSummary;
  nowTs: number;
  isSelected: boolean;
  onClick: () => void;
  config: ApiConfig;
  onDeleted: () => void;
  title?: string;
  onPin?: () => void;
  onRename?: () => void;
}

const STATUS_ICON_COLOR: Record<string, string> = {
  pending: 'bg-placeholder',
  executing: 'bg-warning',
  completed: 'bg-muted',
  failed: 'bg-danger',
  cancelled: 'bg-gray-400',
  paused: 'bg-purple-500',
};

const STATUS_TEXT_COLOR: Record<string, string> = {
  pending: 'text-placeholder',
  executing: 'text-warning',
  completed: 'text-muted',
  failed: 'text-danger',
  cancelled: 'text-gray-400',
  paused: 'text-purple-500',
};

function getSubtitle(workflow: WorkflowSummary): string {
  if (typeof workflow.output === 'string' && workflow.output.length > 0) return workflow.output.slice(0, 40);
  if (workflow.status === 'completed') return 'Completed';
  if (workflow.status === 'executing') return 'Running...';
  if (workflow.status === 'failed') return 'Failed';
  return '';
}

function formatRelativeRunTime(timestamp: string | null | undefined, nowTs: number): string {
  if (!timestamp) return '';
  const runTs = parseApiTimestampMs(timestamp);
  if (runTs === null) return '';

  const diffMs = Math.max(0, nowTs - runTs);
  const minuteMs = 60_000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const weekMs = 7 * dayMs;
  const monthMs = 30 * dayMs;
  const yearMs = 365 * dayMs;

  if (diffMs < minuteMs) return 'just now';
  if (diffMs < hourMs) {
    const minutes = Math.floor(diffMs / minuteMs);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  if (diffMs < dayMs) {
    const hours = Math.floor(diffMs / hourMs);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  if (diffMs < weekMs) {
    const days = Math.floor(diffMs / dayMs);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  if (diffMs < monthMs) {
    const weeks = Math.floor(diffMs / weekMs);
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }
  if (diffMs < yearMs) {
    const months = Math.floor(diffMs / monthMs);
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }

  const years = Math.floor(diffMs / yearMs);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

export function TaskItem({ workflow, nowTs, isSelected, onClick, config, onDeleted, title, onPin, onRename }: TaskItemProps) {
  const handleDelete = async () => {
    try {
      const result = await cancelWorkflow(config, workflow.id);

      if (result.status === 'cancelled') {
        toastInfo('Workflow cancelled', 'Backend delete mode is not active yet. Restart backend to fully delete workflows.');
      } else {
        toastSuccess('Workflow deleted');
      }

      onDeleted();
    } catch (err) {
      toastApiError(err, 'Failed to delete workflow');
    }
  };

  const dotColor = STATUS_ICON_COLOR[workflow.status] ?? 'bg-placeholder';
  const checkColor = STATUS_TEXT_COLOR[workflow.status] ?? 'text-placeholder';
  const isComplete = workflow.status === 'completed' || workflow.status === 'cancelled';
  const subtitle = getSubtitle(workflow);
  const displayTitle = (title ?? workflow.objective).trim() || workflow.objective;
  const runTimestamp = workflow.started_at ?? workflow.created_at;
  const relativeRunTime = formatRelativeRunTime(runTimestamp, nowTs);
  const runDateMs = parseApiTimestampMs(runTimestamp);

  return (
    <div
      className={[
        'group relative flex items-center cursor-pointer rounded-md px-3 py-2.5 gap-2 transition-colors duration-fast justify-between',
        isSelected ? 'bg-taskitem' : 'hover:bg-surface-hover',
      ].join(' ')}
      onClick={onClick}
    >
      {/* Left side: icon + title + chevron + subtitle */}
      <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
        {/* Status icon */}
        {isComplete ? (
          <Check size={14} className={`flex-shrink-0 ${checkColor}`} strokeWidth={2} />
        ) : workflow.status === 'executing' ? (
          <div className={`w-2 h-2 rounded-full animate-pulse flex-shrink-0 ${dotColor}`} />
        ) : (
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
        )}

        {/* Title */}
        <span className="truncate font-sans text-sm font-medium text-primary flex-shrink min-w-0">
          {displayTitle.slice(0, 55)}{displayTitle.length > 55 ? '...' : ''}
        </span>

        {/* Chevron + subtitle */}
        {subtitle && (
          <>
            <ChevronRight size={12} className="flex-shrink-0 text-muted" />
            <span className="truncate font-sans text-sm font-normal text-muted flex-shrink min-w-0">
              {subtitle}
            </span>
          </>
        )}
      </div>

      {/* Right side: context menu */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {relativeRunTime && (
          <span className="font-sans text-xs text-muted whitespace-nowrap" title={runDateMs !== null ? new Date(runDateMs).toLocaleString() : ''}>
            {relativeRunTime}
          </span>
        )}
        <TaskContextMenu onDelete={() => void handleDelete()} onPin={onPin} onRename={onRename} />
      </div>
    </div>
  );
}
