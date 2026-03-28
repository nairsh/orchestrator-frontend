import { useEffect, useRef, useState } from 'react';
import { ArrowLeftToLine, RefreshCw, Play, XCircle, Loader2, Clock, Download } from 'lucide-react';
import { Tooltip } from '@lobehub/ui';
import { useWorkflowStream } from '../../hooks/useWorkflowStream';
import type { ApiConfig } from '../../api/client';
import { retryWorkflow, cancelWorkflow } from '../../api/client';
import { TaskFeed } from './TaskFeed';
import { ClarificationPanel } from './ClarificationPanel';
import { CommandInput } from '../input/CommandInput';
import { Button, IconButton } from '../ui';
import { WorkflowProgress } from '../WorkflowProgress';
import { toastApiError, toastSuccess, toastWorkflowComplete, toastWorkflowFailed } from '../../lib/toast';
import { feedToMarkdown, downloadFile } from '../../lib/exportConversation';
import { humanizeModelName } from '../../lib/modelNames';
import { useNotifications } from '../../hooks/useNotifications';
import { desktopNotify } from '../../lib/desktopNotify';
import type { ModelIconOverrides } from '../../lib/modelIcons';

function formatDuration(startedAt?: string | null, endedAt?: string | null): string | null {
  if (!startedAt || !endedAt) return null;
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 0 || isNaN(ms)) return null;
  if (ms < 1000) return 'under 1s';
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
  const hr = Math.floor(min / 60);
  const remMin = min % 60;
  return remMin > 0 ? `${hr}h ${remMin}m` : `${hr}h`;
}

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
  const { feed, isTerminal, hydrated, currentActivity, thinkingText, isStale, workflowStatus, liveTasks, sendMessage, handleApproval, handleBashApproval, pendingClarification, startedAt, endedAt } = useWorkflowStream(config, workflowId, true, objective);
  const modelLabel = activeModel ? humanizeModelName(activeModel) : 'AI';
  const contentMaxWidth = fullView ? 760 : 600;
  const isFailed = workflowStatus === 'failed';
  const isExecuting = workflowStatus === 'executing';
  const isPaused = workflowStatus === 'paused';
  const hasPendingClarification = isPaused && !!pendingClarification;
  const duration = isTerminal ? formatDuration(startedAt, endedAt) : null;
  const [actionBusy, setActionBusy] = useState<'retry' | 'cancel' | 'resume' | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const { addNotification } = useNotifications();
  const notifiedRef = useRef(false);
  // Captures the terminal state at the moment hydration completes
  const terminalAtHydrationRef = useRef<boolean | null>(null);

  // Record the terminal state when hydration first completes
  useEffect(() => {
    if (hydrated && terminalAtHydrationRef.current === null) {
      terminalAtHydrationRef.current = isTerminal;
    }
  }, [hydrated, isTerminal]);

  // Only notify for live transitions: task was non-terminal after hydration, then became terminal
  useEffect(() => {
    if (!hydrated || terminalAtHydrationRef.current === null) return;
    if (terminalAtHydrationRef.current) return; // Was already terminal at hydration
    if (!isTerminal || notifiedRef.current) return;
    notifiedRef.current = true;
    const truncatedObjective = objective.length > 60 ? objective.slice(0, 60) + '…' : objective;
    if (workflowStatus === 'completed') {
      addNotification({
        type: 'workflow_complete',
        title: 'Task completed',
        message: truncatedObjective,
        workflowId,
      });
      desktopNotify('Task completed', objective);
      toastWorkflowComplete(objective, formatDuration(startedAt, endedAt), activeModel ? humanizeModelName(activeModel) : undefined);
    } else if (workflowStatus === 'failed') {
      addNotification({
        type: 'workflow_failed',
        title: 'Task failed',
        message: truncatedObjective,
        workflowId,
      });
      desktopNotify('Task failed', objective);
      toastWorkflowFailed(objective);
    }
  }, [isTerminal, workflowStatus, hydrated]);

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
      <div className="flex items-center justify-between flex-shrink-0 h-12 px-4 sm:px-8 border-b border-border-subtle">
        <div className="flex items-center gap-4 flex-1 min-w-0 overflow-hidden">
          <IconButton
            size="md"
            label={fullView ? 'Exit full view' : 'Collapse'}
            onClick={fullView ? onOpenFullChat : onCollapse}
          >
            <ArrowLeftToLine size={20} strokeWidth={1.75} />
          </IconButton>
          <span className="font-sans text-sm font-medium text-primary truncate">
            {objective}
          </span>
          {isFailed && <span className="flex-shrink-0 rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger">Failed</span>}
          {isPaused && <span className="flex-shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">Paused</span>}
          {workflowStatus === 'completed' && <span className="flex-shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">Completed</span>}
          {duration && (
            <span className="flex-shrink-0 flex items-center gap-1 rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] font-medium text-muted">
              <Clock size={10} strokeWidth={2} />
              {duration}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Export conversation */}
          {feed.length > 0 && (
            <Tooltip title="Export conversation">
              <IconButton
                size="sm"
                label="Export conversation"
                onClick={() => {
                  const md = feedToMarkdown(objective, feed);
                  const slug = objective.slice(0, 40).replace(/[^a-zA-Z0-9]+/g, '-').replace(/-$/, '');
                  downloadFile(md, `${slug}.md`);
                  toastSuccess('Conversation exported');
                }}
              >
                <Download size={14} />
              </IconButton>
            </Tooltip>
          )}
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
              {cancelConfirm ? (
                <div className="flex items-center gap-1.5 rounded-lg bg-danger/10 px-2 py-1 border border-danger/20">
                  <span className="text-xs text-danger font-medium">Cancel task?</span>
                  <Button variant="danger" size="sm" disabled={!!actionBusy} onClick={() => { setCancelConfirm(false); void handleCancel(); }} className="h-5 px-2 text-[11px]">
                    {actionBusy === 'cancel' ? <Loader2 size={10} className="animate-spin" /> : 'Yes'}
                  </Button>
                  <button type="button" onClick={() => setCancelConfirm(false)} className="text-xs text-muted hover:text-primary transition-colors duration-200" aria-label="Dismiss cancel confirmation">✕</button>
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
          {isPaused && !hasPendingClarification && (
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

          {!isTerminal && !isPaused && (
            <div className="flex items-center gap-1.5 ml-2">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-info" />
              <span className="font-sans text-xs text-muted">{currentActivity}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {liveTasks.length > 0 && !isTerminal && (
        <div className="px-4 sm:px-8 py-2 border-b border-border-subtle/50">
          <WorkflowProgress tasks={liveTasks} isTerminal={isTerminal} />
        </div>
      )}

      {/* Feed */}
      <TaskFeed
        feed={feed}
        currentActivity={isTerminal || isPaused ? undefined : currentActivity}
        thinkingText={isTerminal || isPaused ? undefined : thinkingText}
        isTerminal={isTerminal}
        isStale={isStale}
        maxWidth={contentMaxWidth}
        fullView={fullView}
        onApproval={handleApproval}
        onBashApproval={handleBashApproval}
      />

      {/* Clarification panel appears above chat input */}
      {hasPendingClarification && pendingClarification && (
        <ClarificationPanel
          clarification={pendingClarification}
          maxWidth={contentMaxWidth}
          onSubmit={handleCommand}
          onDismiss={() => {
            // Dismiss just closes the panel without submitting
            // The workflow remains paused and can be resumed manually
          }}
        />
      )}
      
      <CommandInput
        onSubmit={(t) => void handleCommand(t)}
        disabled={(!isTerminal && !isPaused) || hasPendingClarification}
        maxWidth={contentMaxWidth}
        modelLabel={fullView ? modelLabel : undefined}
        animateEntry={animateInputEntry}
      />
    </div>
  );
}
