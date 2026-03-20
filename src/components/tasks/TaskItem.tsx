import { Check, ChevronRight, Monitor } from 'lucide-react';
import type { WorkflowSummary } from '../../api/types';
import type { ApiConfig } from '../../api/client';
import { cancelWorkflow } from '../../api/client';
import { TaskContextMenu } from '../dropdowns/TaskContextMenu';
import { toastApiError } from '../../lib/toast';

interface TaskItemProps {
  workflow: WorkflowSummary;
  isSelected: boolean;
  onClick: () => void;
  config: ApiConfig;
  onDeleted: () => void;
  title?: string;
  onPin?: () => void;
  onRename?: () => void;
}

const STATUS_ICON_COLOR: Record<string, string> = {
  pending: '#999999',
  executing: '#F59E0B',
  completed: '#666666',
  failed: '#EF4444',
  cancelled: '#9CA3AF',
  paused: '#A855F7',
};

function getSubtitle(workflow: WorkflowSummary): string {
  if (typeof workflow.output === 'string' && workflow.output.length > 0) return workflow.output.slice(0, 40);
  if (workflow.status === 'completed') return 'Completed';
  if (workflow.status === 'executing') return 'Running...';
  if (workflow.status === 'failed') return 'Failed';
  return '';
}

export function TaskItem({ workflow, isSelected, onClick, config, onDeleted, title, onPin, onRename }: TaskItemProps) {
  const handleDelete = async () => {
    try {
      await cancelWorkflow(config, workflow.id);
      onDeleted();
    } catch (err) {
      toastApiError(err, 'Failed to cancel workflow');
    }
  };

  const iconColor = STATUS_ICON_COLOR[workflow.status] ?? '#999999';
  const isComplete = workflow.status === 'completed' || workflow.status === 'cancelled';
  const subtitle = getSubtitle(workflow);
  const displayTitle = (title ?? workflow.objective).trim() || workflow.objective;

  return (
    <div
      className="group relative flex items-center cursor-pointer"
      onClick={onClick}
      style={{
        padding: '10px 12px',
        borderRadius: 8,
        background: isSelected ? '#EBEBEB' : 'transparent',
        justifyContent: 'space-between',
        gap: 8,
        transition: 'background 0.15s',
      }}
    >
      {/* Left side: icon + title + chevron + subtitle */}
      <div className="flex items-center min-w-0" style={{ gap: 8, flex: 1, overflow: 'hidden' }}>
        {/* Status icon */}
        {isComplete ? (
          <Check size={14} color={iconColor} strokeWidth={2} style={{ flexShrink: 0 }} />
        ) : workflow.status === 'executing' ? (
          <div className="animate-pulse" style={{ width: 8, height: 8, borderRadius: 4, background: iconColor, flexShrink: 0 }} />
        ) : (
          <div style={{ width: 8, height: 8, borderRadius: 4, background: iconColor, flexShrink: 0 }} />
        )}

        {/* Title */}
        <span
          className="truncate"
          style={{
            fontFamily: 'Inter',
            fontSize: 13,
            fontWeight: 500,
            color: '#111111',
            flexShrink: 1,
            minWidth: 0,
          }}
        >
          {displayTitle.slice(0, 55)}{displayTitle.length > 55 ? '...' : ''}
        </span>

        {/* Chevron + subtitle */}
        {subtitle && (
          <>
            <ChevronRight size={12} color="#888888" style={{ flexShrink: 0 }} />
            <span
              className="truncate"
              style={{
                fontFamily: 'Inter',
                fontSize: 13,
                fontWeight: 400,
                color: '#888888',
                flexShrink: 1,
                minWidth: 0,
              }}
            >
              {subtitle}
            </span>
          </>
        )}
      </div>

      {/* Right side: context menu */}
      <div className="flex items-center" style={{ gap: 12, flexShrink: 0 }}>
        <TaskContextMenu onDelete={() => void handleDelete()} onPin={onPin} onRename={onRename} />
      </div>
    </div>
  );
}
