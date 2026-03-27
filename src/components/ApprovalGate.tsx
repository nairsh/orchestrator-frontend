import { useState } from 'react';
import { Check, X, ShieldAlert, Server, Loader2 } from 'lucide-react';
import { Highlighter, Tag } from '@lobehub/ui';
import { Button } from './ui/Button';
import { toastApiError } from '../lib/toast';

const TOOL_LABELS: Record<string, string> = {
  bash: 'Run Command',
  bash_execute: 'Run Command',
  file_write: 'Write File',
  file_read: 'Read File',
  file_edit: 'Edit File',
  file_delete: 'Delete File',
  glob: 'Find Files',
  grep: 'Search Files',
  web_search: 'Search Web',
  fetch_url: 'Fetch URL',
  code_execution: 'Execute Code',
  spawn_subagent: 'Start Parallel Task',
};

function humanizeToolName(name: string): string {
  return TOOL_LABELS[name] ?? name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

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
  const [approving, setApproving] = useState<'approve' | 'reject' | null>(null);

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
                onClick={() => {
                  setApproving('approve');
                  void Promise.resolve(onApprove(taskId)).catch((err) => toastApiError(err, 'Approval failed')).finally(() => setApproving(null));
                }}
                className="gap-1.5 !bg-success-muted hover:!bg-success"
              >
                {approving === 'approve' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Approve
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={!!approving}
                onClick={() => {
                  setApproving('reject');
                  void Promise.resolve(onReject(taskId)).catch((err) => toastApiError(err, 'Rejection failed')).finally(() => setApproving(null));
                }}
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
