import { ArrowLeftToLine } from 'lucide-react';
import { useWorkflowStream } from '../../hooks/useWorkflowStream';
import type { ApiConfig } from '../../api/client';
import { TaskFeed } from './TaskFeed';
import { CommandInput } from '../input/CommandInput';
import { toastApiError } from '../../lib/toast';

interface TaskDetailProps {
  workflowId: string;
  objective: string;
  config: ApiConfig;
  onCollapse?: () => void;
  onOpenFullChat?: () => void;
  fullView?: boolean;
  activeModel?: string;
  animateInputEntry?: boolean;
}

export function TaskDetail({ workflowId, objective, config, onCollapse, onOpenFullChat, fullView = false, activeModel = 'auto', animateInputEntry = false }: TaskDetailProps) {
  const { feed, isTerminal, currentActivity, sendMessage } = useWorkflowStream(config, workflowId, true, objective);
  const modelLabel = activeModel === 'auto' ? 'Auto' : activeModel;
  const contentMaxWidth = fullView ? 760 : 600;

  const handleCommand = async (text: string) => {
    try {
      await sendMessage(text);
    } catch (err) {
      toastApiError(err, 'Failed to continue workflow');
    }
  };

  return (
    <div className="flex flex-col h-full flex-1 min-w-0" style={{ background: '#FAF8F4' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{
          height: 48,
          padding: '0 48px',
          borderBottom: '1px solid #EBEBEB',
        }}
      >
        <div className="flex items-center min-w-0" style={{ gap: 16, flex: 1, overflow: 'hidden' }}>
          <button
            type="button"
            onClick={onOpenFullChat ?? onCollapse}
            style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <ArrowLeftToLine size={20} color="#666666" strokeWidth={1.75} />
          </button>
          <span style={{
            fontFamily: 'Inter',
            fontSize: 13,
            fontWeight: 500,
            color: '#111111',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {objective}
          </span>
        </div>

        <div className="flex items-center" style={{ gap: 12, flexShrink: 0 }}>
          {!isTerminal && (
            <div className="flex items-center" style={{ gap: 6 }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#3B82F6' }} />
              <span style={{ fontFamily: 'Inter', fontSize: 12, color: '#888888' }}>{currentActivity}</span>
            </div>
          )}
        </div>
      </div>

      {/* Feed */}
      <TaskFeed feed={feed} currentActivity={isTerminal ? undefined : currentActivity} isTerminal={isTerminal} maxWidth={contentMaxWidth} />

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
