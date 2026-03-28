import { useEffect, useMemo, useRef, useState } from 'react';
import { Empty } from '@lobehub/ui';
import type { WorkflowSummary } from '../../api/types';
import type { ApiConfig } from '../../api/client';
import { TaskItem } from './TaskItem';
import { createWorkflow } from '../../api/client';
import { toastApiError, toastInfo, toastSuccess } from '../../lib/toast';
import { useWorkflowMeta } from '../../hooks/useWorkflowMeta';
import type { WorkflowStatusFilter } from '../dropdowns/StatusFilterDropdown';
import { useBillingBalance } from '../../hooks/useBillingBalance';
import type { ModelIconOverrides } from '../../lib/modelIcons';
import { parseApiTimestampMs, groupByDate } from '../../lib/time';
import { SkeletonTaskItem } from '../ui/Skeleton';
import { TaskListHeader } from './TaskListHeader';
import { TaskStartInput } from './TaskStartInput';
import { RenameTaskModal } from './RenameTaskModal';

interface TaskListProps {
  workflows: WorkflowSummary[];
  selectedId: string | null;
  onSelect: (id: string, objective: string) => void;
  config: ApiConfig;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  onRefresh: () => void;
  loading: boolean;
  error?: string | null;
  statusFilter: WorkflowStatusFilter;
  onStatusFilterChange: (value: WorkflowStatusFilter) => void;
  onOpenChat?: () => void;
  onOpenConnectors?: () => void;
  modelIconOverrides?: ModelIconOverrides;
}

export function TaskList({ workflows, selectedId, onSelect, config, selectedModel, onSelectModel, onRefresh, loading, error, statusFilter, onStatusFilterChange, onOpenChat, onOpenConnectors, modelIconOverrides }: TaskListProps) {
  const { togglePin, setDisplayName, getDisplayName, isPinned, sortKey } = useWorkflowMeta();
  const billing = useBillingBalance(config, true);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [startValue, setStartValue] = useState('');
  const [starting, setStarting] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const startInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handler = () => startInputRef.current?.focus();
    window.addEventListener('relay:focus-input', handler);
    return () => window.removeEventListener('relay:focus-input', handler);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNowTs(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const sortedWorkflows = useMemo(() => {
    let arr = [...workflows];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      arr = arr.filter((wf) => {
        const name = getDisplayName(wf.id) ?? wf.objective;
        return name.toLowerCase().includes(q) || wf.objective.toLowerCase().includes(q) || wf.id.toLowerCase().includes(q);
      });
    }
    arr.sort((a, b) => {
      const pin = sortKey(a.id) - sortKey(b.id);
      if (pin !== 0) return pin;
      const bTs = parseApiTimestampMs(b.created_at) ?? 0;
      const aTs = parseApiTimestampMs(a.created_at) ?? 0;
      return bTs - aTs;
    });
    return arr;
  }, [workflows, sortKey, searchQuery, getDisplayName]);

  const groupedWorkflows = useMemo(
    () => groupByDate(
      sortedWorkflows,
      (wf) => parseApiTimestampMs(wf.created_at),
      (wf) => isPinned(wf.id),
      nowTs,
    ),
    [sortedWorkflows, isPinned, nowTs],
  );

  useEffect(() => {
    if (!renameId) return;
    const t = requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
    return () => cancelAnimationFrame(t);
  }, [renameId]);

  const openRename = (wf: WorkflowSummary) => {
    setRenameId(wf.id);
    setRenameValue(getDisplayName(wf.id) ?? wf.objective);
  };

  const closeRename = () => { setRenameId(null); };

  const saveRename = () => {
    if (!renameId) return;
    setDisplayName(renameId, renameValue);
    toastSuccess('Renamed');
    closeRename();
  };

  const handleStart = async (objective: string): Promise<boolean> => {
    if (!selectedModel.trim()) {
      toastInfo('Models loading', 'Please wait a moment and try again.');
      return false;
    }
    setStarting(true);
    try {
      const result = await createWorkflow(config, { objective, orchestrator_model: selectedModel });
      onRefresh();
      onSelect(result.workflow_id, objective);
      return true;
    } catch (err) {
      toastApiError(err, 'Couldn\'t start task');
      return false;
    } finally {
      setStarting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) return;
      e.preventDefault();
      const val = startValue.trim();
      if (val) { void handleStart(val).then((ok) => { if (ok) setStartValue(''); }); }
    }
  };

  const handleStartClick = () => {
    const val = startValue.trim();
    if (!val) return;
    void handleStart(val).then((ok) => { if (ok) setStartValue(''); });
  };

  return (
    <div className="flex flex-col h-full flex-shrink-0 w-full bg-surface-warm">
      <TaskListHeader
        showSearch={showSearch}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onShowSearch={() => setShowSearch(true)}
        onHideSearch={() => setShowSearch(false)}
        loading={loading}
        billing={billing}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        onOpenChat={onOpenChat}
      />

      <div className="flex-1 overflow-y-auto flex flex-col hide-scrollbar bg-surface-warm p-3 sm:p-6 gap-4 sm:gap-6">
        <TaskStartInput
          value={startValue}
          onChange={setStartValue}
          onStart={handleStartClick}
          onKeyDown={handleKeyDown}
          starting={starting}
          inputRef={startInputRef}
          config={config}
          selectedModel={selectedModel}
          onSelectModel={onSelectModel}
          onOpenConnectors={onOpenConnectors}
          modelIconOverrides={modelIconOverrides}
        />

        <div className="flex flex-col gap-2">
          {loading && sortedWorkflows.length === 0 && (
            <>
              <SkeletonTaskItem />
              <SkeletonTaskItem />
              <SkeletonTaskItem />
            </>
          )}
          {sortedWorkflows.length === 0 && !loading && !error && (
            <div className="pt-8">
              <Empty description="Start a task using the input above" emoji="📋" />
            </div>
          )}
          {error && !loading && (
            <div className="flex flex-col items-center pt-8 text-center px-4">
              <p className="text-sm text-danger font-medium">Failed to load tasks</p>
              <p className="text-xs text-secondary mt-1">{error}</p>
              <button
                type="button"
                onClick={onRefresh}
                className="mt-3 text-xs font-medium text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          )}
          {groupedWorkflows.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-medium text-muted uppercase tracking-wide px-2 pt-3 pb-1">{group.label}</p>
              {group.items.map((wf) => (
                <TaskItem
                  key={wf.id}
                  workflow={wf}
                  nowTs={nowTs}
                  isSelected={selectedId === wf.id}
                  onClick={() => onSelect(wf.id, wf.objective)}
                  config={config}
                  onDeleted={onRefresh}
                  title={getDisplayName(wf.id) ?? wf.objective}
                  isPinned={isPinned(wf.id)}
                  onPin={() => {
                    const wasPinned = isPinned(wf.id);
                    togglePin(wf.id);
                    toastSuccess(wasPinned ? 'Unpinned' : 'Pinned');
                  }}
                  onRename={() => openRename(wf)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {renameId && (
        <RenameTaskModal
          renameValue={renameValue}
          onRenameValueChange={setRenameValue}
          onClose={closeRename}
          onSave={saveRename}
          inputRef={renameInputRef}
        />
      )}
    </div>
  );
}
