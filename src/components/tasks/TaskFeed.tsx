import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ChevronDown, GitFork } from 'lucide-react';
import type { FeedEntry } from '../../api/types';
import { FeedItem } from './FeedItem';
import { ThinkingIndicator } from './feed/ThinkingIndicator';
import {
  type ToolEntry,
  type RenderRow,
} from './feed/feedHelpers';

/** Max ms between tool calls to collapse them into a parallel group */
const PARALLEL_TOOL_WINDOW_MS = 1400;

interface TaskFeedProps {
  feed: FeedEntry[];
  currentActivity?: string;
  thinkingText?: string;
  isTerminal: boolean;
  isStale?: boolean;
  maxWidth?: number;
  fullView?: boolean;
  onApproval?: (taskId: string, approved: boolean) => Promise<void>;
  onBashApproval?: (approvalId: string, approved: boolean) => Promise<void>;
}

function ParallelToolCalls({
  entries,
}: {
  entries: ToolEntry[];
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="flex items-center gap-2 bg-transparent border-none cursor-pointer p-0"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${open ? 'Collapse' : 'Expand'} ${entries.length} parallel actions`}
      >
        <GitFork size={15} className="text-muted flex-shrink-0 -rotate-90" />
        <span className="font-sans text-sm text-muted">
          Running {entries.length} actions in parallel
        </span>
        <ChevronDown
          size={14}
          className="text-muted transition-transform duration-slow"
          style={{ transform: open ? 'none' : 'rotate(-90deg)' }}
        />
      </button>

      <div
        className="overflow-hidden transition-all duration-slow"
        style={{ maxHeight: open ? 1400 : 0, opacity: open ? 1 : 0 }}
      >
        <div className="flex flex-col gap-3 ml-6 border-l border-border-subtle/60 pl-3">
          {entries.map((entry, idx) => (
            <FeedItem
              key={`${entry.id}:${idx}`}
              entry={entry}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TaskFeed({ feed, currentActivity, thinkingText, isTerminal, isStale, maxWidth = 600, fullView = false, onApproval, onBashApproval }: TaskFeedProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const renderRows = useMemo<RenderRow[]>(() => {
    const rows: RenderRow[] = [];

    for (let i = 0; i < feed.length; ) {
      const entry = feed[i];

      // Filter out environment status entries
      if (entry.kind === 'system_status' && (
        entry.text === 'Starting environment…' ||
        entry.text === 'Environment started'
      )) {
        i += 1;
        continue;
      }

      if (entry.kind !== 'tool_call') {
        rows.push({ kind: 'entry', key: `entry:${i}`, entry });
        i += 1;
        continue;
      }

      const first = entry;
      const firstAt = Date.parse(first.at ?? '');
      const group: ToolEntry[] = [first];
      let j = i + 1;

      while (j < feed.length && feed[j].kind === 'tool_call') {
        const next = feed[j] as ToolEntry;
        const nextAt = Date.parse(next.at ?? '');
        const sameTask = next.taskId === first.taskId;
        const hasValidTime = Number.isFinite(firstAt) && Number.isFinite(nextAt);
        const withinWindow = hasValidTime ? nextAt - firstAt <= PARALLEL_TOOL_WINDOW_MS : false;

        if (!sameTask || !withinWindow) break;
        group.push(next);
        j += 1;
      }

      if (group.length >= 2) {
        rows.push({ kind: 'tool_parallel', key: `parallel:${i}:${j}`, entries: group });
        i = j;
      } else {
        rows.push({ kind: 'entry', key: `entry:${i}`, entry });
        i += 1;
      }
    }

    return rows;
  }, [feed]);

  // Track whether user is near the bottom of the scroll container
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [hasNewContent, setHasNewContent] = useState(false);
  const prevRowCount = useRef(renderRows.length);

  const checkIfNearBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setHasNewContent(false);
  }, []);

  // Listen for scroll events to track position
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const near = checkIfNearBottom();
      setIsNearBottom(near);
      if (near) setHasNewContent(false);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [checkIfNearBottom]);

  // Auto-scroll only when new rows appear and user is at bottom; otherwise mark new content
  useEffect(() => {
    const rowCountChanged = renderRows.length !== prevRowCount.current;
    prevRowCount.current = renderRows.length;
    if (!rowCountChanged) return;
    if (isNearBottom) {
      scrollToBottom();
    } else {
      setHasNewContent(true);
    }
  }, [renderRows.length, isNearBottom, scrollToBottom]);

  return (
    <div ref={scrollContainerRef} role="log" aria-live="polite" className={`flex-1 overflow-y-auto flex flex-col items-center px-4 md:px-16 pb-20 ${fullView ? 'pt-6' : 'pt-4'}`}>
      <div className="flex flex-col w-full relative" style={{ maxWidth, paddingTop: 32 }}>

        {renderRows.map((row, idx) => {
          const prev = renderRows[idx - 1];
          const prevIsTool = prev?.kind === 'tool_parallel' || (prev?.kind === 'entry' && prev.entry.kind === 'tool_call');
          const rowIsTool = row.kind === 'tool_parallel' || (row.kind === 'entry' && row.entry.kind === 'tool_call');
          const bothTools = prevIsTool && rowIsTool;
          const messageToTool = prev && !prevIsTool && rowIsTool;
          const toolToMessage = prev && prevIsTool && !rowIsTool;
          const mt = idx === 0 ? 0 : bothTools ? 4 : messageToTool ? 12 : toolToMessage ? 16 : 24;

          const rowIsUser = row.kind === 'entry' && (row.entry.kind === 'prompt' || row.entry.kind === 'user_message');

          return (
            <div
              key={row.key}
              className="relative"
              style={{
                marginTop: mt,
                marginBottom: !fullView && rowIsUser ? 8 : 0,
              }}
            >
              <div className="min-w-0 w-full">
                {row.kind === 'tool_parallel' ? (
                  <ParallelToolCalls entries={row.entries} />
                ) : (
                  <FeedItem entry={row.entry} onApproval={onApproval} onBashApproval={onBashApproval} fullView={fullView} />
                )}
              </div>
            </div>
          );
        })}

        {!isTerminal && currentActivity && (
          <ThinkingIndicator currentActivity={currentActivity} thinkingText={thinkingText} isStale={isStale} />
        )}
      </div>

      {/* Scroll-to-bottom floating button */}
      {!isNearBottom && (
        <div className="sticky bottom-6 z-10 flex justify-center pointer-events-none">
          <button
            type="button"
            onClick={scrollToBottom}
            className="pointer-events-auto flex items-center gap-1.5 px-4 py-2 rounded-full
              bg-primary text-white shadow-lg
              text-xs font-semibold
              transition-all duration-200 hover:shadow-xl hover:brightness-110 active:scale-95
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            aria-label="Scroll to bottom"
          >
            <ArrowDown size={14} />
            {hasNewContent ? 'New activity below' : 'Jump to bottom'}
          </button>
        </div>
      )}
    </div>
  );
}
