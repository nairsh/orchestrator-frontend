import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ChevronDown } from 'lucide-react';
import type { FeedEntry } from '../../api/types';
import { FeedItem } from './FeedItem';
import type { ModelIconOverrides } from '../../lib/modelIcons';
import { ThinkingIndicator } from './feed/ThinkingIndicator';
import { TimelineMarker } from './feed/TimelineMarker';
import {
  type ToolEntry,
  type RenderRow,
  TIMELINE_RAIL_X,
  TIMELINE_ROW_PADDING_LEFT,
  markerKindForRow,
  markerIconForRow,
} from './feed/feedHelpers';
import type { ApiConfig } from '../../api/client';

/** Max ms between tool calls to collapse them into a parallel group */
const PARALLEL_TOOL_WINDOW_MS = 1400;

interface TaskFeedProps {
  feed: FeedEntry[];
  currentActivity?: string;
  isTerminal: boolean;
  isStale?: boolean;
  maxWidth?: number;
  fullView?: boolean;
  modelIconOverrides?: ModelIconOverrides;
  workflowId?: string;
  config?: ApiConfig;
  onApproval?: (taskId: string, approved: boolean) => Promise<void>;
}

function ParallelToolCalls({
  entries,
  modelIconOverrides,
}: {
  entries: ToolEntry[];
  modelIconOverrides?: ModelIconOverrides;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="flex items-center gap-2 bg-transparent border-none cursor-pointer p-0"
        onClick={() => setOpen((v) => !v)}
      >
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
        <div className="flex flex-col gap-3 ml-[22px]">
          {entries.map((entry, idx) => (
            <FeedItem
              key={`${entry.id}:${idx}`}
              entry={entry}
              inTimeline
              modelIconOverrides={modelIconOverrides}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TaskFeed({ feed, currentActivity, isTerminal, isStale, maxWidth = 600, fullView = false, modelIconOverrides, workflowId, config, onApproval }: TaskFeedProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const railContainerRef = useRef<HTMLDivElement>(null);
  const firstMarkerRef = useRef<HTMLDivElement | null>(null);
  const lastMarkerRef = useRef<HTMLDivElement | null>(null);
  const [railTopOffset, setRailTopOffset] = useState(0);
  const [railBottomOffset, setRailBottomOffset] = useState(0);
  const hasThinkingRow = !isTerminal && /thinking/i.test(currentActivity ?? '');

  const renderRows = useMemo<RenderRow[]>(() => {
    const rows: RenderRow[] = [];

    for (let i = 0; i < feed.length; ) {
      const entry = feed[i];
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

  const markerIndices = renderRows
    .map((row, idx) => (markerKindForRow(row) === 'none' ? -1 : idx))
    .filter((idx) => idx >= 0);

  const firstMarkerIndex = markerIndices.length > 0 ? markerIndices[0] : -1;
  const lastMarkerIndex = markerIndices.length > 0 ? markerIndices[markerIndices.length - 1] : -1;
  const lastUserDotIndex = (() => {
    for (let i = renderRows.length - 1; i >= 0; i -= 1) {
      const row = renderRows[i];
      if (row.kind === 'entry' && (row.entry.kind === 'prompt' || row.entry.kind === 'user_message')) return i;
    }
    return -1;
  })();

  const hasTimeline = markerIndices.length > 0;
  const totalRows = renderRows.length + (hasThinkingRow ? 1 : 0);

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

  // Auto-scroll only when user is at bottom; otherwise mark new content
  useEffect(() => {
    if (renderRows.length === prevRowCount.current) return;
    prevRowCount.current = renderRows.length;
    if (isNearBottom) {
      scrollToBottom();
    } else {
      setHasNewContent(true);
    }
  }, [renderRows.length, isNearBottom, scrollToBottom]);

  useEffect(() => {
    if (!hasTimeline) {
      firstMarkerRef.current = null;
      lastMarkerRef.current = null;
      setRailTopOffset(0);
      setRailBottomOffset(0);
      return;
    }

    const updateRailSpan = () => {
      const container = railContainerRef.current;
      const firstMarker = firstMarkerRef.current;
      const lastMarker = lastMarkerRef.current;
      if (!container || !firstMarker || !lastMarker) {
        setRailTopOffset(0);
        setRailBottomOffset(0);
        return;
      }

      const cRect = container.getBoundingClientRect();
      const fRect = firstMarker.getBoundingClientRect();
      const lRect = lastMarker.getBoundingClientRect();
      const firstCenter = fRect.top - cRect.top + fRect.height / 2;
      const lastCenter = lRect.top - cRect.top + lRect.height / 2;
      setRailTopOffset(Math.max(0, firstCenter));
      setRailBottomOffset(Math.max(0, container.scrollHeight - lastCenter));
    };

    updateRailSpan();
    const ro = new ResizeObserver(() => updateRailSpan());
    if (railContainerRef.current) ro.observe(railContainerRef.current);
    return () => ro.disconnect();
  }, [renderRows, hasTimeline]);

  return (
    <div ref={scrollContainerRef} className={`flex-1 overflow-y-auto flex flex-col items-center px-16 pb-20 ${fullView ? 'pt-6' : 'pt-4'}`}>
      <div ref={railContainerRef} className="flex flex-col w-full relative" style={{ maxWidth, paddingTop: hasTimeline ? 0 : 32 }}>
        {/* Timeline rail - solid line connecting all markers */}
        {hasTimeline && (
          <div
            className="absolute pointer-events-none bg-border-light"
            style={{
              left: `${TIMELINE_RAIL_X - 1}px`,
              top: railTopOffset,
              bottom: railBottomOffset,
              width: '2px',
            }}
          />
        )}

        {renderRows.map((row, idx) => {
          const prev = renderRows[idx - 1];
          const prevIsTool = prev?.kind === 'tool_parallel' || (prev?.kind === 'entry' && prev.entry.kind === 'tool_call');
          const rowIsTool = row.kind === 'tool_parallel' || (row.kind === 'entry' && row.entry.kind === 'tool_call');
          const bothTools = prevIsTool && rowIsTool;
          const messageToTool = prev && !prevIsTool && rowIsTool;
          const toolToMessage = prev && prevIsTool && !rowIsTool;
          const mt = idx === 0 ? 0 : bothTools ? 8 : messageToTool ? 18 : toolToMessage ? 22 : 28;

          const markerKind = markerKindForRow(row);
          const rowIsUser = row.kind === 'entry' && (row.entry.kind === 'prompt' || row.entry.kind === 'user_message');
          const MarkerIcon = markerIconForRow(row);

          return (
            <div
              key={row.key}
              className="relative"
              style={{
                marginTop: mt,
                marginBottom: !fullView && rowIsUser ? 10 : 0,
                paddingLeft: TIMELINE_ROW_PADDING_LEFT,
              }}
            >
              {markerKind !== 'none' && (
                <TimelineMarker
                  markerKind={markerKind}
                  MarkerIcon={MarkerIcon}
                  isLastUserDot={idx === lastUserDotIndex}
                  markerRef={(el) => {
                    if (idx === firstMarkerIndex) firstMarkerRef.current = el;
                    if (idx === lastMarkerIndex) lastMarkerRef.current = el;
                  }}
                />
              )}

              <div className="min-w-0 w-full">
                {row.kind === 'tool_parallel' ? (
                  <ParallelToolCalls entries={row.entries} modelIconOverrides={modelIconOverrides} />
                ) : (
                  <FeedItem entry={row.entry} inTimeline modelIconOverrides={modelIconOverrides} onApproval={onApproval} fullView={fullView} />
                )}
              </div>
            </div>
          );
        })}

        {!isTerminal && currentActivity && (
          <ThinkingIndicator currentActivity={currentActivity} isStale={isStale} />
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
