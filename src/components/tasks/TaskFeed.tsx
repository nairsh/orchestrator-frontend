import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, CircleAlert, FileText, GitBranch, Globe, ListChecks, ScanSearch, Terminal, Wrench } from 'lucide-react';
import type { FeedEntry } from '../../api/types';
import { FeedItem } from './FeedItem';
import type { ModelIconOverrides } from '../../lib/modelIcons';

import type { ApiConfig } from '../../api/client';

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

type ToolEntry = Extract<FeedEntry, { kind: 'tool_call' }>;
type RenderRow =
  | { kind: 'entry'; key: string; entry: FeedEntry }
  | { kind: 'tool_parallel'; key: string; entries: ToolEntry[] };

const TIMELINE_RAIL_X = 16;
const TIMELINE_ROW_PADDING_LEFT = 46;
const TIMELINE_MARKER_SIZE = 24;

function toolIconForName(toolName: string) {
  if (['write_todo', 'edit_todo', 'list_todos', 'spawn_subagent', 'await_subagents'].includes(toolName)) return ListChecks;
  if (['file_read', 'file_write', 'file_edit'].includes(toolName)) return FileText;
  if (['web_search', 'fetch_url', 'browse', 'screenshot'].includes(toolName)) return Globe;
  if (['glob', 'grep'].includes(toolName)) return ScanSearch;
  if (toolName === 'bash') return Terminal;
  return Wrench;
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
          const showMarker = markerKind !== 'none';
          const rowIsUser = row.kind === 'entry' && (row.entry.kind === 'prompt' || row.entry.kind === 'user_message');

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
            <div
              key={row.key}
              className="relative"
              style={{
                marginTop: mt,
                marginBottom: !fullView && rowIsUser ? 10 : 0,
                paddingLeft: TIMELINE_ROW_PADDING_LEFT,
              }}
            >
              {showMarker && (
                <div
                  ref={(el) => {
                    if (idx === firstMarkerIndex) firstMarkerRef.current = el;
                    if (idx === lastMarkerIndex) lastMarkerRef.current = el;
                  }}
                  className="absolute"
                  style={{
                    left: `${TIMELINE_RAIL_X}px`,
                    top: 0,
                    width: TIMELINE_MARKER_SIZE,
                    height: TIMELINE_MARKER_SIZE,
                    transform: 'translateX(-50%)',
                  }}
                >
                  {markerKind === 'dot' ? (
                    <div className="w-6 h-6 flex items-center justify-center">
                      <div
                        className={[
                          'w-3 h-3 rounded-full border-2 border-surface',
                          idx === lastUserDotIndex ? 'bg-ink' : 'bg-muted',
                        ].join(' ')}
                      />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-surface flex items-center justify-center border-2 border-surface shadow-sm">
                      <MarkerIcon size={14} className={markerKind === 'warning' ? 'text-amber-700' : 'text-muted'} />
                    </div>
                  )}
                </div>
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

        {/* Thinking shimmer */}
        {!isTerminal && currentActivity && (
          <div className="relative pl-8 mt-4">
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
        )}
      </div>
    </div>
  );
}
