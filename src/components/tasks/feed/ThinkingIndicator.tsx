import { useState } from 'react';
import { ChevronRight, CircleAlert, RefreshCw } from 'lucide-react';
import { Markdown } from '../../markdown/Markdown';

interface ThinkingIndicatorProps {
  currentActivity: string;
  thinkingText?: string;
  isStale?: boolean;
  onRetryConnection?: () => void;
}

export function ThinkingIndicator({ currentActivity, thinkingText, isStale, onRetryConnection }: ThinkingIndicatorProps) {
  const [expanded, setExpanded] = useState(false);
  const hasContent = Boolean(thinkingText?.trim());

  return (
    <div className="relative mt-4">
      <div className="min-w-0 flex flex-col gap-1.5">
        {hasContent ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-left group"
            aria-expanded={expanded}
            aria-label={expanded ? 'Hide thinking content' : 'Show thinking content'}
          >
            <ChevronRight
              size={14}
              className={`text-muted transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
            />
            <span className="font-sans text-base font-medium text-muted shimmer-text">
              {currentActivity}
            </span>
          </button>
        ) : (
          <span className="font-sans text-base font-medium text-muted shimmer-text">
            {currentActivity}
          </span>
        )}

        {expanded && thinkingText && (
          <div className="ml-5 mt-1 rounded-lg border border-border bg-surface-warm/50 px-3 py-2 text-sm text-secondary max-h-64 overflow-y-auto fade-in-soft">
            <Markdown content={thinkingText} />
          </div>
        )}

        {isStale && (
          <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 mt-1">
            <CircleAlert size={14} className="text-warning shrink-0" />
            <span className="font-sans text-sm text-secondary flex-1">
              No updates for 30s — connection may be stale.
            </span>
            {onRetryConnection && (
              <button
                type="button"
                onClick={onRetryConnection}
                className="flex items-center gap-1 font-sans text-xs font-medium text-warning hover:text-primary bg-warning/10 hover:bg-warning/20 px-2 py-1 rounded-md transition-colors cursor-pointer shrink-0"
              >
                <RefreshCw size={12} />
                Reconnect
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
