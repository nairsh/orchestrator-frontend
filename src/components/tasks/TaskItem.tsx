import { memo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Tooltip } from '@lobehub/ui';
import type { WorkflowSummary } from '../../api/types';
import type { ApiConfig } from '../../api/client';
import { cancelWorkflow } from '../../api/client';
import { TaskContextMenu } from '../dropdowns/TaskContextMenu';
import { toastApiError, toastSuccess } from '../../lib/toast';
import { parseApiTimestampMs, formatDateTime } from '../../lib/time';
import { StatusDot } from '../shared/StatusDot';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from '../ui';

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
  isPinned?: boolean;
}

const STATUS_TEXT_COLOR: Record<string, string> = {
  pending: 'text-placeholder',
  executing: 'text-warning',
  completed: 'text-muted',
  failed: 'text-danger',
  cancelled: 'text-muted',
  paused: 'text-status-paused',
};

function getSubtitle(workflow: WorkflowSummary): string {
  if (typeof workflow.output === 'string' && workflow.output.length > 0) {
    return workflow.output.length > 40 ? workflow.output.slice(0, 40) + '…' : workflow.output;
  }
  if (workflow.status === 'completed') return 'Completed';
  if (workflow.status === 'executing') return 'Running…';
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

export const TaskItem = memo(function TaskItem({ workflow, nowTs, isSelected, onClick, config, onDeleted, title, onPin, onRename, isPinned }: TaskItemProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await cancelWorkflow(config, workflow.id);
      toastSuccess('Task deleted');
      setDeleteConfirm(false);
      onDeleted();
    } catch (err) {
      toastApiError(err, 'Couldn\'t delete this task');
    } finally {
      setDeleting(false);
    }
  };

  const dotColor = STATUS_TEXT_COLOR[workflow.status] ?? 'text-placeholder';
  const subtitle = getSubtitle(workflow);
  const displayTitle = (title ?? workflow.objective).trim() || workflow.objective;
  const runTimestamp = workflow.started_at ?? workflow.created_at;
  const relativeRunTime = formatRelativeRunTime(runTimestamp, nowTs);
  const runDateMs = parseApiTimestampMs(runTimestamp);

  return (
    <>
    <div
      role="button"
      tabIndex={0}
      className={[
        'group relative flex items-center cursor-pointer rounded-xl px-3 py-2.5 gap-2 transition-colors duration-200 justify-between active:bg-surface-tertiary',
        isSelected ? 'bg-surface-secondary' : 'hover:bg-surface-hover',
      ].join(' ')}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    >
      {/* Left side: status dot + title + chevron + subtitle */}
      <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
        {/* Status indicator */}
        <StatusDot status={workflow.status} />

        {/* Title */}
        <span className="truncate font-sans text-sm font-medium text-primary flex-shrink min-w-0" title={displayTitle}>
          {displayTitle}
        </span>

        {/* Chevron + subtitle — hidden on very narrow viewports */}
        {subtitle && (
          <>
            <ChevronRight size={12} className="flex-shrink-0 text-muted hidden sm:block" />
            <span className="truncate font-sans text-sm font-normal text-muted flex-shrink min-w-0 hidden sm:block">
              {subtitle}
            </span>
          </>
        )}
      </div>

      {/* Right side: timestamp + context menu */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {relativeRunTime && (
          <Tooltip title={runDateMs !== null ? formatDateTime(runDateMs) : ''}>
            <span className={`font-sans text-xs whitespace-nowrap ${dotColor}`}>
              {relativeRunTime}
            </span>
          </Tooltip>
        )}
        <TaskContextMenu onDelete={() => setDeleteConfirm(true)} onPin={onPin} onRename={onRename} isPinned={isPinned} />
      </div>
    </div>

    {deleteConfirm && (
      <Modal onClose={() => { if (!deleting) setDeleteConfirm(false); }} maxWidth="max-w-sm">
        <ModalHeader title="Delete task?" onClose={() => { if (!deleting) setDeleteConfirm(false); }} />
        <ModalBody>
          <p className="text-sm text-secondary">This will permanently delete the task and its history. This cannot be undone.</p>
        </ModalBody>
        <ModalFooter className="justify-end gap-2">
          <Button variant="ghost" disabled={deleting} onClick={() => setDeleteConfirm(false)}>Cancel</Button>
          <Button variant="danger" disabled={deleting} onClick={() => void handleDelete()}>{deleting ? 'Deleting…' : 'Delete'}</Button>
        </ModalFooter>
      </Modal>
    )}
    </>
  );
});
