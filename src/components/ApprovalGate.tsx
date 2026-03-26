import { Check, X, ShieldAlert } from 'lucide-react';
import { Highlighter, Tag } from '@lobehub/ui';
import { Button } from './ui/Button';

interface ApprovalGateProps {
  taskId: string;
  toolName: string;
  command?: string;
  reason?: string;
  status: 'pending' | 'resolved';
  onApprove?: (taskId: string) => void;
  onReject?: (taskId: string) => void;
}

export function ApprovalGate({ taskId, toolName, command, reason, status, onApprove, onReject }: ApprovalGateProps) {
  const isPending = status === 'pending';

  return (
    <div className={`rounded-lg border px-4 py-3 ${
      isPending
        ? 'border-warning/30 bg-warning/10'
        : 'border-border-light bg-surface-secondary'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isPending ? 'bg-warning/15' : 'bg-surface-tertiary'
        }`}>
          <ShieldAlert size={18} className={isPending ? 'text-warning' : 'text-muted'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${isPending ? 'text-warning' : 'text-secondary'}`}>
              {isPending ? 'Approval Required' : 'Approval Resolved'}
            </span>
            {isPending && (
              <Tag color="warning" size="small">Waiting</Tag>
            )}
          </div>
          <p className="text-xs text-secondary mt-1">
            <span className="font-medium">{toolName}</span>
            {reason && <span> — {reason}</span>}
          </p>
          {command && (
            <div className="mt-2">
              <Highlighter language="bash" variant="filled" copyable>
                {command}
              </Highlighter>
            </div>
          )}
          {isPending && onApprove && onReject && (
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="primary"
                size="sm"
                onClick={() => onApprove(taskId)}
                className="gap-1.5 !bg-success-muted hover:!bg-success"
              >
                <Check size={14} />
                Approve
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => onReject(taskId)}
                className="gap-1.5"
              >
                <X size={14} />
                Reject
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
