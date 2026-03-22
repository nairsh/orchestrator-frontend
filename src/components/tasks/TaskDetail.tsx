import { ArrowLeftToLine } from 'lucide-react';
import { useWorkflowStream } from '../../hooks/useWorkflowStream';
import type { ApiConfig } from '../../api/client';
import { TaskFeed } from './TaskFeed';
import { CommandInput } from '../input/CommandInput';
import { IconButton } from '../ui/IconButton';
import { toastApiError } from '../../lib/toast';
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
}: TaskDetailProps) {
  const { feed, isTerminal, currentActivity, sendMessage } = useWorkflowStream(config, workflowId, true, objective);
  const modelLabel = activeModel || 'Unknown model';
  const contentMaxWidth = fullView ? 760 : 600;

  const handleCommand = async (text: string) => {
    try {
      await sendMessage(text);
    } catch (err) {
      toastApiError(err, 'Failed to continue workflow');
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

        <div className="flex items-center gap-3 flex-shrink-0">
          {!isTerminal && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-info" />
              <span className="font-sans text-xs text-muted">{currentActivity}</span>
            </div>
          )}
        </div>
      </div>

      {/* Feed */}
      <TaskFeed
        feed={feed}
        currentActivity={isTerminal ? undefined : currentActivity}
        isTerminal={isTerminal}
        maxWidth={contentMaxWidth}
        modelIconOverrides={modelIconOverrides}
      />

      {/* Input */}
      <CommandInput
        onSubmit={(t) => void handleCommand(t)}
        disabled={!isTerminal}
        maxWidth={contentMaxWidth}
        modelLabel={fullView ? modelLabel : undefined}
        animateEntry={animateInputEntry}
      />
    </div>
  );
}
