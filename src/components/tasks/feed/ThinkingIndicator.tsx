import { useState } from 'react';
import { ChevronRight, CircleAlert } from 'lucide-react';
import { Markdown } from '../../markdown/Markdown';

interface ThinkingIndicatorProps {
  currentActivity: string;
  thinkingText?: string;
  isStale?: boolean;
}

export function ThinkingIndicator({ currentActivity, thinkingText, isStale }: ThinkingIndicatorProps) {
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
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 mt-1">
            <CircleAlert size={14} className="text-warning mt-0.5 shrink-0" />
            <span className="font-sans text-sm text-secondary">
              No updates received for 30 seconds. The AI may be slow or unreachable. Check your connection or try a different AI.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
