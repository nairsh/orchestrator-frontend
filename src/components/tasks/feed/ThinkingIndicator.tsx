import { CircleAlert } from 'lucide-react';

interface ThinkingIndicatorProps {
  currentActivity: string;
  isStale?: boolean;
}

export function ThinkingIndicator({ currentActivity, isStale }: ThinkingIndicatorProps) {
  return (
    <div className="relative mt-4">
      <div className="min-w-0 flex flex-col gap-1.5">
        <span className="font-sans text-base font-medium text-muted shimmer-text">
          {currentActivity}
        </span>
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
