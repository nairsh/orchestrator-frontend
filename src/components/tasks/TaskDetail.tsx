import { ArrowLeftToLine, RefreshCw, Pause, Play, XCircle } from 'lucide-react';
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
  const modelLabel = activeModel || 'Unknown model';
  const contentMaxWidth = fullView ? 760 : 600;
  const isFailed = workflowStatus === 'failed';
  const isExecuting = workflowStatus === 'executing';
  const isPaused = workflowStatus === 'paused';

  const handleCommand = async (text: string) => {
    try {
      await sendMessage(text);
    } catch (err) {
      toastApiError(err, 'Failed to continue workflow');
    }
  };

  const handleRetry = async () => {
    try {
      await retryWorkflow(config, workflowId);
      toastSuccess('Workflow retrying');
      onRefreshList?.();
    } catch (err) {
      toastApiError(err, 'Failed to retry workflow');
    }
  };

  const handlePause = async () => {
    try {
      await pauseWorkflow(config, workflowId);
      toastSuccess('Workflow paused');
    } catch (err) {
      toastApiError(err, 'Failed to pause workflow');
    }
  };

  const handleCancel = async () => {
    try {
      await cancelWorkflow(config, workflowId);
      toastSuccess('Workflow cancelled');
      onRefreshList?.();
    } catch (err) {
      toastApiError(err, 'Failed to cancel workflow');
    }
  };

  return (
    <div className="flex flex-col h-full flex-1 min-w-0 bg-surface-warm">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 h-12 px-12 border-b border-border-light">
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
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Workflow control buttons */}
          {isFailed && (
            <Tooltip title="Retry workflow">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleRetry()}
                className="gap-1.5 text-info border-info/20 hover:bg-info/10"
              >
                <RefreshCw size={12} />
                Retry
              </Button>
            </Tooltip>
          )}
          {isExecuting && (
            <>
              <Tooltip title="Pause workflow">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handlePause()}
                >
                  <Pause size={12} />
                </Button>
              </Tooltip>
              <Tooltip title="Cancel workflow">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => void handleCancel()}
                  className="opacity-75 hover:opacity-100"
                >
                  <XCircle size={12} />
                </Button>
              </Tooltip>
            </>
          )}
          {isPaused && (
            <Tooltip title="Resume workflow">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleCommand('continue')}
                className="gap-1.5 text-accent border-accent/20 hover:bg-accent/10"
              >
                <Play size={12} />
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
        <div className="px-12 py-2 border-b border-border-light/50">
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
