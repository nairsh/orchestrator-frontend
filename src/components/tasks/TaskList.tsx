import { useEffect, useMemo, useRef, useState } from 'react';
import { Coins, MessageSquare, ArrowUp } from 'lucide-react';
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
import { Button, IconButton, Input, Modal, ModalHeader, ModalBody, ModalFooter, Textarea } from '../ui';
import type { ModelIconOverrides } from '../../lib/modelIcons';
import { parseApiTimestampMs } from '../../lib/time';

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
    const arr = [...workflows];
    arr.sort((a, b) => {
      const pin = sortKey(a.id) - sortKey(b.id);
      if (pin !== 0) return pin;
      const bTs = parseApiTimestampMs(b.created_at) ?? 0;
      const aTs = parseApiTimestampMs(a.created_at) ?? 0;
      return bTs - aTs;
    });
    return arr;
  }, [workflows, sortKey]);

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
      toastInfo('Model unavailable', 'Wait for model discovery to complete, then try again.');
      return;
    }

    try {
      const result = await createWorkflow(config, {
        objective,
        orchestrator_model: selectedModel,
      });
      onRefresh();
      onSelect(result.workflow_id, objective);
    } catch (err) {
      toastApiError(err, 'Failed to start workflow');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) return;
      e.preventDefault();
      const val = e.currentTarget.value.trim();
      if (val) { void handleStart(val); e.currentTarget.value = ''; }
    }
  };

  const handleStartClick = () => {
    const val = startInputRef.current?.value.trim() ?? '';
    if (!val) return;
    void handleStart(val);
    if (startInputRef.current) startInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-full flex-shrink-0 w-full bg-surface-warm">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 h-12 px-6 border-b border-border bg-surface-warm">
        <span className="font-sans text-[16px] font-medium text-primary">Tasks</span>

        <div className="flex items-center gap-4">
          {loading && <div className="w-1.5 h-1.5 rounded-full bg-info animate-pulse" />}

          {/* Coins pill */}
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={() => {
              if (!billing.data) {
                toastInfo('Billing', 'Sign in to see credits.');
                return;
              }
              toastInfo(
                `${billingCredits.toFixed(2)} credits`,
                `Tier: ${billing.data.tier} • Period usage: ${periodCreditsUsed.toFixed(2)} credits (${periodRequestCount} requests)`
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
            label="Open agent chat"
            onClick={() => onOpenChat?.()}
            className="border border-border rounded-lg px-3 py-2"
          >
            <MessageSquare size={16} className="text-primary" />
          </IconButton>

          {/* Filter */}
          <StatusFilterDropdown value={statusFilter} onChange={onStatusFilterChange} />
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto flex flex-col hide-scrollbar bg-surface-warm p-6 gap-6">
        {/* Start a task input */}
        <div className="flex flex-col flex-shrink-0 rounded-xl bg-surface-tertiary border border-border px-3.5 py-3 min-h-[92px] gap-2.5">
          <Textarea
            ref={startInputRef}
            placeholder="Start a task"
            onKeyDown={handleKeyDown}
            maxHeight={100}
            className="text-md"
          />
          <div className="flex items-center mt-auto">
            <PlusDropdown
              outlined
              onUploadFiles={() => toastInfo('Not supported yet', 'Attachments are only supported when starting a new workflow from landing.')}
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
              <IconButton size="lg" filled onClick={handleStartClick} label="Start workflow">
                <ArrowUp size={14} />
              </IconButton>
            </div>
          </div>
        </div>

        {/* Task list */}
        <div className="flex flex-col gap-2">
          {sortedWorkflows.length === 0 && !loading && (
            <div className="text-center pt-12 flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-tertiary flex items-center justify-center">
                <span className="text-lg">✨</span>
              </div>
              <div className="font-sans text-base text-placeholder">
                No tasks yet
              </div>
              <div className="font-sans text-sm text-placeholder/70">
                Start a workflow using the input above
              </div>
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
          <ModalHeader title="Rename workflow" onClose={closeRename} />
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
