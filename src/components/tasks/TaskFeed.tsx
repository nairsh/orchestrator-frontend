import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, CircleAlert, FileText, GitBranch, Globe, ListChecks, ScanSearch, Terminal, Wrench } from 'lucide-react';
import type { FeedEntry } from '../../api/types';
import { FeedItem } from './FeedItem';
import type { ModelIconOverrides } from '../../lib/modelIcons';

interface TaskFeedProps {
  feed: FeedEntry[];
  currentActivity?: string;
  isTerminal: boolean;
  isStale?: boolean;
  maxWidth?: number;
  modelIconOverrides?: ModelIconOverrides;
}

type ToolEntry = Extract<FeedEntry, { kind: 'tool_call' }>;
type RenderRow =
  | { kind: 'entry'; key: string; entry: FeedEntry }
  | { kind: 'tool_parallel'; key: string; entries: ToolEntry[] };

function toolIconForName(toolName: string) {
  if (['write_todo', 'edit_todo', 'list_todos', 'spawn_subagent', 'await_subagents'].includes(toolName)) return ListChecks;
  if (['file_read', 'file_write', 'file_edit'].includes(toolName)) return FileText;
  if (['web_search', 'fetch_url', 'browse', 'screenshot'].includes(toolName)) return Globe;
  if (['glob', 'grep'].includes(toolName)) return ScanSearch;
  if (toolName === 'bash') return Terminal;
  return Wrench;
}

function ParallelToolCalls({ entries, modelIconOverrides }: { entries: ToolEntry[]; modelIconOverrides?: ModelIconOverrides }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="flex items-center gap-2 bg-transparent border-none cursor-pointer p-0"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-sans text-sm text-muted">
          Running {entries.length} tool calls in parallel
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
            <FeedItem key={`${entry.id}:${idx}`} entry={entry} inTimeline modelIconOverrides={modelIconOverrides} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TaskFeed({ feed, currentActivity, isTerminal, isStale, maxWidth = 600, modelIconOverrides }: TaskFeedProps) {
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
        const withinWindow = hasValidTime ? nextAt - firstAt <= 1400 : false;

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

  const markerKindForRow = (row: RenderRow): 'none' | 'dot' | 'tool' | 'warning' => {
    if (row.kind === 'tool_parallel') return 'tool';
    if (row.entry.kind === 'ai_message') return 'dot';
    if (row.entry.kind === 'system_status') return 'dot';
    if (row.entry.kind === 'task_group') return 'tool';
    if (row.entry.kind === 'tool_call') return 'tool';
    if (row.entry.kind === 'bash_approval') return 'warning';
    return 'none';
  };

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
  const lineTopOpacity = 0.82;
  const lineBottomOpacity = Math.max(0.14, 0.32 - totalRows * 0.004);
  const lineMidOpacity = (lineTopOpacity + lineBottomOpacity) / 2;

  const getDotOpacity = (index: number, total: number): number => {
    if (total <= 1) return 0.75;
    const t = index / (total - 1);
    return Math.max(0.38, 0.9 - 0.52 * t);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [renderRows.length]);

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
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto flex flex-col items-center px-16 pb-20">
      <div ref={railContainerRef} className="flex flex-col w-full relative" style={{ maxWidth, paddingTop: hasTimeline ? 0 : 32 }}>
        {/* Timeline rail */}
        {hasTimeline && (
          <div
            className="absolute pointer-events-none transition-[top,bottom] duration-slow will-change-[top,bottom]"
            style={{
              left: 7,
              top: railTopOffset,
              bottom: railBottomOffset,
              width: 1.5,
              background: `linear-gradient(180deg, rgba(176,176,176,${lineTopOpacity}) 0%, rgba(176,176,176,${lineMidOpacity}) 54%, rgba(176,176,176,${lineBottomOpacity}) 100%)`,
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
          const showMarker = markerKind !== 'none';
          const dotOpacity = getDotOpacity(idx, totalRows);

          let MarkerIcon = Terminal;
          if (row.kind === 'tool_parallel') {
            MarkerIcon = GitBranch;
          } else if (row.kind === 'entry' && row.entry.kind === 'task_group') {
            MarkerIcon = GitBranch;
          } else if (row.kind === 'entry' && row.entry.kind === 'tool_call') {
            MarkerIcon = toolIconForName(row.entry.toolName);
          } else if (row.kind === 'entry' && row.entry.kind === 'bash_approval') {
            MarkerIcon = CircleAlert;
          }

          return (
            <div key={row.key} className="relative pl-6" style={{ marginTop: mt }}>
              {showMarker && (
                <div
                  ref={(el) => {
                    if (idx === firstMarkerIndex) firstMarkerRef.current = el;
                    if (idx === lastMarkerIndex) lastMarkerRef.current = el;
                  }}
                >
                  {markerKind === 'dot' ? (
                    <div
                      className={[
                        'absolute w-2 h-2 rounded-full',
                        idx === lastUserDotIndex ? 'bg-ink' : 'bg-muted',
                      ].join(' ')}
                      style={{
                        left: 3,
                        top: 10,
                        opacity: dotOpacity,
                      }}
                    />
                  ) : (
                    <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full bg-surface-warm flex items-center justify-center">
                      <MarkerIcon size={13} className={markerKind === 'warning' ? 'text-amber-700' : 'text-muted'} />
                    </div>
                  )}
                </div>
              )}

              <div className="min-w-0 w-full">
                {row.kind === 'tool_parallel' ? (
                  <ParallelToolCalls entries={row.entries} modelIconOverrides={modelIconOverrides} />
                ) : (
                  <FeedItem entry={row.entry} inTimeline modelIconOverrides={modelIconOverrides} />
                )}
              </div>
            </div>
          );
        })}

        {/* Thinking shimmer */}
        {!isTerminal && currentActivity && (
          <div className="relative pl-6 mt-4">
            <div className="min-w-0 flex flex-col gap-1.5">
              <span className="font-sans text-base font-medium text-muted shimmer-text">
                Thinking
              </span>
              {isStale && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 mt-1 dark:border-amber-800 dark:bg-amber-950/30">
                  <CircleAlert size={14} className="text-amber-600 mt-0.5 shrink-0 dark:text-amber-400" />
                  <span className="font-sans text-sm text-amber-800 dark:text-amber-300">
                    No updates received for 30 seconds. The model may be slow or unreachable. Check your connection or try a different model.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
