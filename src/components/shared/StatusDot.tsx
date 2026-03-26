import { Check } from 'lucide-react';
import { Tooltip } from '@lobehub/ui';

/* ─── StatusDot ───
 * Shared status indicator used in task lists and wherever
 * workflow/task status needs a visual dot or check mark.
 */

type WorkflowStatus = 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled' | 'paused';

interface StatusDotProps {
  status: WorkflowStatus | string;
  className?: string;
}

const dotColor: Record<string, string> = {
  pending: 'bg-placeholder',
  executing: 'bg-warning animate-pulse',
  completed: 'bg-muted',
  failed: 'bg-danger',
  cancelled: 'bg-placeholder',
  paused: 'bg-status-paused',
};

const checkColor: Record<string, string> = {
  completed: 'text-muted',
  cancelled: 'text-placeholder',
};

const terminalStatuses = new Set(['completed', 'cancelled']);

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  executing: 'Executing',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
  paused: 'Paused',
};

export function StatusDot({ status, className = '' }: StatusDotProps) {
  const label = statusLabel[status] ?? status;

  if (terminalStatuses.has(status)) {
    const color = checkColor[status] ?? 'text-muted';
    return (
      <Tooltip title={label}>
        <Check size={14} className={`flex-shrink-0 ${color} ${className}`} strokeWidth={2} />
      </Tooltip>
    );
  }

  const color = dotColor[status] ?? 'bg-placeholder';
  return (
    <Tooltip title={label}>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color} ${className}`} />
    </Tooltip>
  );
}
