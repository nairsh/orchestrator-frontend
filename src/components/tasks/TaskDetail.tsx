import { useState } from 'react';
import { ArrowLeftToLine, RefreshCw, Pause, Play, XCircle, Loader2 } from 'lucide-react';
import { Tooltip } from '@lobehub/ui';
import { useWorkflowStream } from '../../hooks/useWorkflowStream';
import type { ApiConfig } from '../../api/client';
import { retryWorkflow, pauseWorkflow, cancelWorkflow } from '../../api/client';
import { TaskFeed } from './TaskFeed';
import { CommandInput } from '../input/CommandInput';
import { Button, IconButton } from '../ui';
import { WorkflowProgress } from '../WorkflowProgress';
import { toastApiError, toastSuccess } from '../../lib/toast';
import type { ModelIconOverrides } from '../../lib/modelIcons';

interface TaskDetailProps {
  workflowId: string;
  objective: string;
  config: ApiConfig;
  onCollapse?: () => void;
  onOpenFullChat?: () => void;
  fullView?: boolean;
  activeModel?: string;
  animateInputEntry?: boolean;
  modelIconOverrides?: ModelIconOverrides;
  onRefreshList?: () => void;
}

export function TaskDetail({
  workflowId,
  objective,
  config,
  onCollapse,
  onOpenFullChat,
  fullView = false,
  activeModel = '',
  animateInputEntry = false,
  modelIconOverrides,
  onRefreshList,
}: TaskDetailProps) {
  const { feed, isTerminal, currentActivity, isStale, workflowStatus, liveTasks, sendMessage, handleApproval } = useWorkflowStream(config, workflowId, true, objective);
  const modelLabel = activeModel || 'AI';
  const contentMaxWidth = fullView ? 760 : 600;
  const isFailed = workflowStatus === 'failed';
  const isExecuting = workflowStatus === 'executing';
  const isPaused = workflowStatus === 'paused';
  const [actionBusy, setActionBusy] = useState<'retry' | 'pause' | 'cancel' | 'resume' | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const handleCommand = async (text: string) => {
    try {
      await sendMessage(text);
    } catch (err) {
      toastApiError(err, 'Couldn\'t send your message');
    }
  };

  const handleRetry = async () => {
    setActionBusy('retry');
    try {
      await retryWorkflow(config, workflowId);
      toastSuccess('Retrying task');
      onRefreshList?.();
    } catch (err) {
      toastApiError(err, 'Couldn\'t retry this task');
    } finally { setActionBusy(null); }
  };

  const handlePause = async () => {
    setActionBusy('pause');
    try {
      await pauseWorkflow(config, workflowId);
      toastSuccess('Task paused');
    } catch (err) {
      toastApiError(err, 'Couldn\'t pause this task');
    } finally { setActionBusy(null); }
  };

  const handleCancel = async () => {
    setActionBusy('cancel');
    try {
      await cancelWorkflow(config, workflowId);
      toastSuccess('Task cancelled');
      onRefreshList?.();
    } catch (err) {
      toastApiError(err, 'Couldn\'t cancel this task');
    } finally { setActionBusy(null); }
  };

  return (
    <div className="flex flex-col h-full flex-1 min-w-0 bg-surface-warm">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 h-12 px-8 border-b border-border-subtle">
        <div className="flex items-center gap-4 flex-1 min-w-0 overflow-hidden">
          <IconButton
            size="md"
            label={fullView ? 'Exit full view' : 'Collapse'}
            onClick={onOpenFullChat ?? onCollapse}
          >
            <ArrowLeftToLine size={20} strokeWidth={1.75} />
          </IconButton>
          <span className="font-sans text-sm font-medium text-primary truncate">
            {objective}
          </span>
          {isFailed && <span className="flex-shrink-0 rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger">Failed</span>}
          {isPaused && <span className="flex-shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">Paused</span>}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Task control buttons */}
          {isFailed && (
            <Tooltip title="Retry task">
              <Button
                variant="secondary"
                size="sm"
                disabled={!!actionBusy}
                onClick={() => void handleRetry()}
                className="gap-1.5 text-info border-info/20 hover:bg-info/10"
              >
                {actionBusy === 'retry' ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Retry
              </Button>
            </Tooltip>
          )}
          {isExecuting && (
            <>
              <Tooltip title="Pause task">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!!actionBusy}
                  onClick={() => void handlePause()}
                >
                  {actionBusy === 'pause' ? <Loader2 size={12} className="animate-spin" /> : <Pause size={12} />}
                </Button>
              </Tooltip>
              {cancelConfirm ? (
                <div className="flex items-center gap-1.5 rounded-lg bg-danger/10 px-2 py-1 border border-danger/20">
                  <span className="text-xs text-danger font-medium">Cancel task?</span>
                  <Button variant="danger" size="sm" disabled={!!actionBusy} onClick={() => { setCancelConfirm(false); void handleCancel(); }} className="h-5 px-2 text-[11px]">
                    {actionBusy === 'cancel' ? <Loader2 size={10} className="animate-spin" /> : 'Yes'}
                  </Button>
                  <button type="button" onClick={() => setCancelConfirm(false)} className="text-xs text-muted hover:text-primary">✕</button>
                </div>
              ) : (
                <Tooltip title="Cancel task">
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={!!actionBusy}
                    onClick={() => setCancelConfirm(true)}
                    className="opacity-75 hover:opacity-100"
                  >
                    <XCircle size={12} />
                  </Button>
                </Tooltip>
              )}
            </>
          )}
          {isPaused && (
            <Tooltip title="Resume task">
              <Button
                variant="secondary"
                size="sm"
                disabled={!!actionBusy}
                onClick={async () => { setActionBusy('resume'); try { await handleCommand('continue'); } finally { setActionBusy(null); } }}
                className="gap-1.5 text-accent border-accent/20 hover:bg-accent/10"
              >
                {actionBusy === 'resume' ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                Resume
              </Button>
            </Tooltip>
          )}

          {!isTerminal && (
            <div className="flex items-center gap-1.5 ml-2">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-info" />
              <span className="font-sans text-xs text-muted">{currentActivity}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {liveTasks.length > 0 && !isTerminal && (
        <div className="px-8 py-2 border-b border-border-subtle/50">
          <WorkflowProgress tasks={liveTasks} isTerminal={isTerminal} />
        </div>
      )}

      {/* Feed */}
      <TaskFeed
        feed={feed}
        currentActivity={isTerminal ? undefined : currentActivity}
        isTerminal={isTerminal}
        isStale={isStale}
        maxWidth={contentMaxWidth}
        modelIconOverrides={modelIconOverrides}
        workflowId={workflowId}
        config={config}
        onApproval={handleApproval}
      />

      {/* Input — enabled when terminal for follow-up */}
      <CommandInput
        onSubmit={(t) => void handleCommand(t)}
        disabled={!isTerminal && !isPaused}
        maxWidth={contentMaxWidth}
        modelLabel={fullView ? modelLabel : undefined}
        animateEntry={animateInputEntry}
      />
    </div>
  );
}
