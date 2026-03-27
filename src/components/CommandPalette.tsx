import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, ArrowRight, FileText, Clock, Zap, Settings, LayoutGrid, Brain, Calendar, Database } from 'lucide-react';
import { Empty, Hotkey } from '@lobehub/ui';
import type { WorkflowSummary } from '../api/types';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  workflows: WorkflowSummary[];
  onSelectWorkflow: (id: string, objective: string) => void;
  onNavigate: (target: 'tasks' | 'files' | 'connectors' | 'skills' | 'landing') => void;
  onOpenSettings: () => void;
  onNewWorkflow: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  category: 'recent' | 'navigation' | 'actions';
  icon: React.ReactNode;
  action: () => void;
  keywords?: string;
}

export function CommandPalette({
  open,
  onClose,
  workflows,
  onSelectWorkflow,
  onNavigate,
  onOpenSettings,
  onNewWorkflow,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const items = useMemo<CommandItem[]>(() => {
    const result: CommandItem[] = [];

    // Actions
    result.push(
      { id: 'new-workflow', label: 'New Task', category: 'actions', icon: <Zap size={16} />, action: () => { onNewWorkflow(); onClose(); }, keywords: 'create start workflow' },
      { id: 'open-settings', label: 'Open Settings', category: 'actions', icon: <Settings size={16} />, action: () => { onOpenSettings(); onClose(); }, keywords: 'config preferences' },
    );

    // Navigation
    result.push(
      { id: 'nav-tasks', label: 'Go to Tasks', category: 'navigation', icon: <LayoutGrid size={16} />, action: () => { onNavigate('tasks'); onClose(); }, keywords: 'workflows' },
      { id: 'nav-files', label: 'Go to Files', category: 'navigation', icon: <FileText size={16} />, action: () => { onNavigate('files'); onClose(); }, keywords: 'knowledge documents' },
      { id: 'nav-connectors', label: 'Go to Connectors', category: 'navigation', icon: <Database size={16} />, action: () => { onNavigate('connectors'); onClose(); }, keywords: 'github linear notion' },
      { id: 'nav-skills', label: 'Go to Skills', category: 'navigation', icon: <Brain size={16} />, action: () => { onNavigate('skills'); onClose(); }, keywords: 'prompts' },
    );

    // Recent workflows
    const recent = workflows.slice(0, 8);
    for (const wf of recent) {
      result.push({
        id: `wf-${wf.id}`,
        label: wf.objective.length > 60 ? wf.objective.slice(0, 60) + '…' : wf.objective,
        category: 'recent',
        icon: <Clock size={16} />,
        action: () => { onSelectWorkflow(wf.id, wf.objective); onClose(); },
        keywords: wf.objective,
      });
    }

    return result;
  }, [workflows, onSelectWorkflow, onNavigate, onOpenSettings, onNewWorkflow, onClose]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((item) => {
      const searchable = `${item.label} ${item.keywords ?? ''} ${item.category}`.toLowerCase();
      return searchable.includes(q);
    });
  }, [items, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [filtered, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!open) return null;

  const grouped = {
    actions: filtered.filter((i) => i.category === 'actions'),
    navigation: filtered.filter((i) => i.category === 'navigation'),
    recent: filtered.filter((i) => i.category === 'recent'),
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-surface rounded-xl shadow-2xl border border-border overflow-hidden animate-scale-in">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-light">
          <Search size={18} className="text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, actions, pages..."
            className="flex-1 bg-transparent text-sm text-primary placeholder:text-placeholder outline-none font-sans"
          />
          <kbd className="text-2xs text-muted bg-surface-tertiary rounded px-1.5 py-0.5 border border-border-light font-mono">
            <Hotkey keys="escape" />
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[320px] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="py-8">
              <Empty description="No results found" />
            </div>
          )}

          {grouped.actions.length > 0 && (
            <>
              <div className="px-4 py-1.5 text-2xs font-medium text-muted uppercase tracking-wider">Actions</div>
              {grouped.actions.map((item, i) => {
                const globalIdx = filtered.indexOf(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.action}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${
                      globalIdx === selectedIndex ? 'bg-surface-hover text-primary' : 'text-secondary hover:bg-surface-hover'
                    }`}
                  >
                    <span className="text-muted">{item.icon}</span>
                    <span className="flex-1 truncate">{item.label}</span>
                    <ArrowRight size={14} className="text-muted opacity-0 group-hover:opacity-100" />
                  </button>
                );
              })}
            </>
          )}

          {grouped.navigation.length > 0 && (
            <>
              <div className="px-4 py-1.5 text-2xs font-medium text-muted uppercase tracking-wider mt-1">Navigation</div>
              {grouped.navigation.map((item) => {
                const globalIdx = filtered.indexOf(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.action}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${
                      globalIdx === selectedIndex ? 'bg-surface-hover text-primary' : 'text-secondary hover:bg-surface-hover'
                    }`}
                  >
                    <span className="text-muted">{item.icon}</span>
                    <span className="flex-1 truncate">{item.label}</span>
                  </button>
                );
              })}
            </>
          )}

          {grouped.recent.length > 0 && (
            <>
              <div className="px-4 py-1.5 text-2xs font-medium text-muted uppercase tracking-wider mt-1">Recent Tasks</div>
              {grouped.recent.map((item) => {
                const globalIdx = filtered.indexOf(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.action}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${
                      globalIdx === selectedIndex ? 'bg-surface-hover text-primary' : 'text-secondary hover:bg-surface-hover'
                    }`}
                  >
                    <span className="text-muted">{item.icon}</span>
                    <span className="flex-1 truncate">{item.label}</span>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border-light bg-surface-secondary/60">
          <span className="flex items-center gap-1 text-2xs text-muted"><Hotkey keys="up" /> <Hotkey keys="down" /> Navigate</span>
          <span className="flex items-center gap-1 text-2xs text-muted"><Hotkey keys="enter" /> Select</span>
          <span className="flex items-center gap-1 text-2xs text-muted"><Hotkey keys="escape" /> Close</span>
        </div>
      </div>
    </div>
  );
}
