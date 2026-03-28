import { useCallback, useState } from 'react';
import { Check, X, ShieldAlert, Server, Loader2 } from 'lucide-react';
import { Highlighter, Tag } from '@lobehub/ui';
import { Button } from './ui/Button';
import { toastApiError } from '../lib/toast';
import { humanizeToolName } from '../lib/toolLabels';

interface ApprovalGateProps {
  approvalId: string;
  toolName: string;
  command?: string;
  reason?: string;
  status: 'pending' | 'resolved';
  onApprove?: (approvalId: string) => void;
  onReject?: (approvalId: string) => void;
}

export function ApprovalGate({ approvalId, toolName, command, reason, status, onApprove, onReject }: ApprovalGateProps) {
  const isPending = status === 'pending';
  const [approving, setApproving] = useState<'approve' | 'reject' | null>(null);

  const handleApprove = useCallback(() => {
    if (!onApprove) return;
    setApproving('approve');
    void Promise.resolve(onApprove(approvalId)).catch((err) => toastApiError(err, 'Approval failed')).finally(() => setApproving(null));
  }, [approvalId, onApprove]);

  const handleReject = useCallback(() => {
    if (!onReject) return;
    setApproving('reject');
    void Promise.resolve(onReject(approvalId)).catch((err) => toastApiError(err, 'Rejection failed')).finally(() => setApproving(null));
  }, [approvalId, onReject]);

  return (
    <div className={`rounded-xl border px-4 py-3 ${
      isPending
        ? 'border-warning/30 bg-warning/10'
        : 'border-border-light bg-surface-secondary'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
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
            <span className="font-medium">{humanizeToolName(toolName)}</span>
            {reason && <span> — {reason}</span>}
          </p>
          {command && (
            <div className="mt-2">
              <Highlighter language="bash" variant="filled" copyable>
                {command}
              </Highlighter>
            </div>
          )}
          {isPending && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
              <Server size={11} className="flex-shrink-0" />
              <span>Runs on the AI server, not your local machine.</span>
            </div>
          )}
          {isPending && onApprove && onReject && (
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="primary"
                size="sm"
                disabled={!!approving}
                onClick={handleApprove}
                className="gap-1.5 !bg-success-muted hover:!bg-success"
              >
                {approving === 'approve' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Approve
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={!!approving}
                onClick={handleReject}
                className="gap-1.5"
              >
                {approving === 'reject' ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                Reject
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
