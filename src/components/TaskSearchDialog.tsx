import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, ArrowRight, Clock, CheckCircle2, XCircle, Loader2, Pause, AlertTriangle } from 'lucide-react';
import { Hotkey } from '@lobehub/ui';
import { listWorkflows } from '../api/client';
import type { ApiConfig } from '../api/client';
import type { WorkflowSummary } from '../api/types';
import { relativeTimeAgo } from '../lib/time';

interface TaskSearchDialogProps {
  open: boolean;
  onClose: () => void;
  config: ApiConfig;
  onSelectWorkflow: (id: string, objective: string) => void;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 size={14} className="text-accent" />,
  executing: <Loader2 size={14} className="text-info animate-spin" />,
  failed: <XCircle size={14} className="text-danger" />,
  cancelled: <XCircle size={14} className="text-muted" />,
  paused: <Pause size={14} className="text-warning" />,
  pending: <Clock size={14} className="text-muted" />,
};

const STATUS_LABEL: Record<string, string> = {
  completed: 'Completed',
  executing: 'Running',
  failed: 'Failed',
  cancelled: 'Cancelled',
  paused: 'Paused',
  pending: 'Pending',
};

export function TaskSearchDialog({
  open,
  onClose,
  config,
  onSelectWorkflow,
}: TaskSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch workflows on open
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSelectedIndex(0);
    setFetchError(false);
    setLoading(true);
    listWorkflows(config, { limit: 50 })
      .then((res) => setWorkflows(res.workflows ?? []))
      .catch(() => { setWorkflows([]); setFetchError(true); })
      .finally(() => setLoading(false));
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open, config]);

  // Filter workflows by query (client-side for speed)
  const filtered = useMemo(() => {
    if (!query.trim()) return workflows;
    const q = query.toLowerCase();
    return workflows.filter((w) => {
      const searchable = `${w.objective} ${w.status} ${w.id}`.toLowerCase();
      return searchable.includes(q);
    });
  }, [workflows, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Tab') {
        // Trap focus within dialog — only the search input is focusable
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (filtered.length > 0) setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (filtered.length > 0) setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        const wf = filtered[selectedIndex];
        onSelectWorkflow(wf.id, wf.objective);
        onClose();
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [filtered, selectedIndex, onSelectWorkflow, onClose],
  );

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[18vh] bg-black/30 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search tasks"
        className="w-full max-w-xl bg-surface rounded-2xl shadow-modal border border-border-light overflow-hidden animate-scale-in"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-light">
          <Search size={18} className="text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks by name, status, or ID…"
            className="flex-1 bg-transparent text-sm text-primary placeholder:text-placeholder outline-none font-sans"
            role="combobox"
            aria-expanded={filtered.length > 0}
            aria-controls="task-search-listbox"
            aria-activedescendant={filtered.length > 0 ? `task-search-option-${selectedIndex}` : undefined}
          />
          {loading && <Loader2 size={14} className="animate-spin text-muted flex-shrink-0" />}
          <kbd className="text-2xs text-muted bg-surface-tertiary rounded px-1.5 py-0.5 border border-border-light font-mono">
            <Hotkey keys="escape" />
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} id="task-search-listbox" role="listbox" className="max-h-[380px] overflow-y-auto py-1">
          {!loading && fetchError && (
            <div className="py-10 text-center">
              <AlertTriangle size={20} className="mx-auto text-danger mb-2" />
              <div className="text-sm text-muted">
                Couldn't load tasks — check your connection and try again
              </div>
            </div>
          )}

          {!loading && !fetchError && filtered.length === 0 && (
            <div className="py-10 text-center">
              <AlertTriangle size={20} className="mx-auto text-muted mb-2" />
              <div className="text-sm text-muted">
                {query ? 'No tasks match your search' : 'No tasks found'}
              </div>
            </div>
          )}

          {filtered.map((wf, i) => {
            const isSelected = i === selectedIndex;
            const statusIcon = STATUS_ICON[wf.status] ?? <Clock size={14} className="text-muted" />;
            const statusLabel = STATUS_LABEL[wf.status] ?? wf.status;
            const timeStr = wf.updated_at || wf.created_at;

            return (
              <button
                key={wf.id}
                id={`task-search-option-${i}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelectWorkflow(wf.id, wf.objective);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-200 ${
                  isSelected
                    ? 'bg-surface-hover text-primary'
                    : 'text-secondary hover:bg-surface-hover'
                }`}
              >
                <span className="flex-shrink-0">{statusIcon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-primary truncate">
                    {wf.objective || 'Untitled task'}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-2xs text-muted">{statusLabel}</span>
                    <span className="text-2xs text-placeholder">·</span>
                    <span className="text-2xs text-placeholder">{relativeTimeAgo(new Date(timeStr).getTime())}</span>
                  </div>
                </div>
                {isSelected && (
                  <ArrowRight size={14} className="text-muted flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border-light bg-surface-secondary/60">
          <span className="flex items-center gap-1 text-2xs text-muted">
            <Hotkey keys="up" /> <Hotkey keys="down" /> Navigate
          </span>
          <span className="flex items-center gap-1 text-2xs text-muted">
            <Hotkey keys="enter" /> Open
          </span>
          <span className="flex items-center gap-1 text-2xs text-muted">
            <Hotkey keys="escape" /> Close
          </span>
          {filtered.length > 0 && (
            <span className="ml-auto text-2xs text-placeholder">
              {filtered.length} task{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
