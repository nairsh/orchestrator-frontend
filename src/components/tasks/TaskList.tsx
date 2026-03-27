import { useEffect, useMemo, useRef, useState } from 'react';
import { Coins, MessageSquare, ArrowUp, Search, Loader2 } from 'lucide-react';
import { Empty } from '@lobehub/ui';
import type { WorkflowSummary } from '../../api/types';
import type { ApiConfig } from '../../api/client';
import { TaskItem } from './TaskItem';
import { createWorkflow } from '../../api/client';
import { toastApiError, toastInfo, toastSuccess } from '../../lib/toast';
import { useWorkflowMeta } from '../../hooks/useWorkflowMeta';
import { StatusFilterDropdown, type WorkflowStatusFilter } from '../dropdowns/StatusFilterDropdown';
import { useBillingBalance } from '../../hooks/useBillingBalance';
import { PlusDropdown } from '../dropdowns/PlusDropdown';
import { ModelDropdown } from '../dropdowns/ModelDropdown';
import { Button, IconButton, Input, Modal, ModalHeader, ModalBody, ModalFooter, Textarea, SearchInput } from '../ui';
import type { ModelIconOverrides } from '../../lib/modelIcons';
import { parseApiTimestampMs } from '../../lib/time';
import { SkeletonTaskItem } from '../ui/Skeleton';

interface TaskListProps {
  workflows: WorkflowSummary[];
  selectedId: string | null;
  onSelect: (id: string, objective: string) => void;
  config: ApiConfig;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  onRefresh: () => void;
  loading: boolean;
  statusFilter: WorkflowStatusFilter;
  onStatusFilterChange: (value: WorkflowStatusFilter) => void;
  onOpenChat?: () => void;
  onOpenConnectors?: () => void;
  modelIconOverrides?: ModelIconOverrides;
}

export function TaskList({ workflows, selectedId, onSelect, config, selectedModel, onSelectModel, onRefresh, loading, statusFilter, onStatusFilterChange, onOpenChat, onOpenConnectors, modelIconOverrides }: TaskListProps) {
  const { togglePin, setDisplayName, getDisplayName, isPinned, sortKey } = useWorkflowMeta();
  const billing = useBillingBalance(config, true);
  const billingCredits = typeof billing.data?.credits_balance === 'number' ? billing.data.credits_balance : 0;
  const periodCreditsUsed = typeof billing.data?.usage_this_period?.credits_used === 'number' ? billing.data.usage_this_period.credits_used : 0;
  const periodRequestCount = typeof billing.data?.usage_this_period?.request_count === 'number' ? billing.data.usage_this_period.request_count : 0;
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [startValue, setStartValue] = useState('');
  const [starting, setStarting] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const startInputRef = useRef<HTMLTextAreaElement>(null);

  // Listen for Cmd+K focus event
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
    // Filter by search query
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

  const closeRename = () => {
    setRenameId(null);
  };

  const saveRename = () => {
    if (!renameId) return;
    setDisplayName(renameId, renameValue);
    toastSuccess('Renamed');
    closeRename();
  };

  const handleStart = async (objective: string) => {
    if (!selectedModel.trim()) {
      toastInfo('Models loading', 'Please wait a moment and try again.');
      return;
    }

    setStarting(true);
    try {
      const result = await createWorkflow(config, {
        objective,
        orchestrator_model: selectedModel,
      });
      onRefresh();
      onSelect(result.workflow_id, objective);
    } catch (err) {
      toastApiError(err, 'Failed to start task');
    } finally {
      setStarting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) return;
      e.preventDefault();
      const val = startValue.trim();
      if (val) { void handleStart(val); setStartValue(''); }
    }
  };

  const handleStartClick = () => {
    const val = startValue.trim();
    if (!val) return;
    void handleStart(val);
    setStartValue('');
  };

  return (
    <div className="flex flex-col h-full flex-shrink-0 w-full bg-surface-warm">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 h-12 px-6 border-b border-border bg-surface-warm">
        {showSearch ? (
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onEscape={() => { setShowSearch(false); setSearchQuery(''); }}
            autoFocus
            placeholder="Search tasks…"
          />
        ) : (
          <>
            <span className="font-sans text-[16px] font-medium text-primary">Tasks</span>
            <div className="flex items-center gap-4">
              {loading && <div className="w-1.5 h-1.5 rounded-full bg-info animate-pulse" />}

              {/* Search button */}
              <IconButton size="md" label="Search tasks" onClick={() => setShowSearch(true)}>
                <Search size={16} className="text-muted" />
              </IconButton>

          {/* Coins pill */}
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={() => {
              if (!billing.data) {
                if (billing.error) {
                  toastInfo('Credits unavailable', 'Could not load billing info. Check your server connection.');
                } else {
                  toastInfo('Billing', 'Sign in to see credits.');
                }
                return;
              }
              toastInfo(
                `${billingCredits.toFixed(2)} credits remaining`,
                `Plan: ${billing.data.tier} • Used this period: ${periodCreditsUsed.toFixed(2)} credits`
              );
            }}
          >
            <Coins size={16} className="text-primary" />
            <span className="font-sans text-base font-medium text-primary">
              {billing.data ? billingCredits.toFixed(2) : '—'}
            </span>
          </Button>

          {/* Chat pill */}
          <IconButton
            size="md"
            label="Open chat"
            onClick={() => onOpenChat?.()}
            className="border border-border rounded-lg px-3 py-2"
          >
            <MessageSquare size={16} className="text-primary" />
          </IconButton>

          {/* Filter */}
          <StatusFilterDropdown value={statusFilter} onChange={onStatusFilterChange} />
            </div>
          </>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto flex flex-col hide-scrollbar bg-surface-warm p-6 gap-6">
        {/* Start a task input */}
        <div className="flex flex-col flex-shrink-0 rounded-xl bg-surface-tertiary border border-border px-3.5 py-3 min-h-[92px] gap-2.5">
          <Textarea
            ref={startInputRef}
            value={startValue}
            onChange={(e) => setStartValue(e.target.value)}
            placeholder="Start a task"
            onKeyDown={handleKeyDown}
            maxHeight={100}
            className="text-md"
          />
          <div className="flex items-center mt-auto">
            <PlusDropdown
              outlined
              onUploadFiles={() => toastInfo('Open a task first', 'Files can only be attached when starting a new task from the main screen.')}
              onOpenConnectors={() => onOpenConnectors?.()}
            />
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <ModelDropdown
                config={config}
                selected={selectedModel}
                onSelect={onSelectModel}
                modelIconOverrides={modelIconOverrides}
              />
              <button
                type="button"
                onClick={handleStartClick}
                disabled={!startValue.trim() || starting}
                aria-label="Start task"
                className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center transition-opacity ${startValue.trim() && !starting ? 'opacity-100 cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                style={{ backgroundColor: 'var(--relay-primary, #0A0A0A)', color: 'white' }}
              >
                {starting ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={15} />}
              </button>
            </div>
          </div>
        </div>

        {/* Task list */}
        <div className="flex flex-col gap-2">
          {loading && sortedWorkflows.length === 0 && (
            <>
              <SkeletonTaskItem />
              <SkeletonTaskItem />
              <SkeletonTaskItem />
            </>
          )}
          {sortedWorkflows.length === 0 && !loading && (
            <div className="pt-8">
              <Empty
                description="Start a task using the input above"
                emoji="📋"
              />
            </div>
          )}
          {sortedWorkflows.map((wf) => (
            <TaskItem
              key={wf.id}
              workflow={wf}
              nowTs={nowTs}
              isSelected={selectedId === wf.id}
              onClick={() => onSelect(wf.id, wf.objective)}
              config={config}
              onDeleted={onRefresh}
              title={getDisplayName(wf.id) ?? wf.objective}
              onPin={() => {
                const wasPinned = isPinned(wf.id);
                togglePin(wf.id);
                toastSuccess(wasPinned ? 'Unpinned' : 'Pinned');
              }}
              onRename={() => openRename(wf)}
            />
          ))}
        </div>
      </div>

      {/* Rename modal */}
      {renameId && (
        <Modal onClose={closeRename}>
          <ModalHeader title="Rename task" onClose={closeRename} />
          <ModalBody>
            <div className="space-y-3">
              <Input
                ref={renameInputRef}
                label="Name"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
              />
              <div className="text-xs text-muted">
                Stored locally in this browser.
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="justify-end gap-2">
            <Button variant="ghost" onClick={closeRename}>Cancel</Button>
            <Button variant="primary" onClick={saveRename} disabled={!renameValue.trim()}>Save</Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
