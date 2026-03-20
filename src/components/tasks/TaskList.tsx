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

interface TaskListProps {
  workflows: WorkflowSummary[];
  selectedId: string | null;
  onSelect: (id: string, objective: string) => void;
  config: ApiConfig;
  selectedModel: string;
  onRefresh: () => void;
  loading: boolean;
  statusFilter: WorkflowStatusFilter;
  onStatusFilterChange: (value: WorkflowStatusFilter) => void;
  onOpenChat?: () => void;
  onOpenConnectors?: () => void;
}

export function TaskList({ workflows, selectedId, onSelect, config, selectedModel, onRefresh, loading, statusFilter, onStatusFilterChange, onOpenChat, onOpenConnectors }: TaskListProps) {
  const { togglePin, setDisplayName, getDisplayName, isPinned, sortKey } = useWorkflowMeta();
  const billing = useBillingBalance(config, true);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameVisible, setRenameVisible] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const startInputRef = useRef<HTMLTextAreaElement>(null);

  const sortedWorkflows = useMemo(() => {
    const arr = [...workflows];
    arr.sort((a, b) => {
      const pin = sortKey(a.id) - sortKey(b.id);
      if (pin !== 0) return pin;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return arr;
  }, [workflows, sortKey]);

  useEffect(() => {
    if (!renameId) return;
    const t = requestAnimationFrame(() => {
      setRenameVisible(true);
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
    return () => cancelAnimationFrame(t);
  }, [renameId]);

  useEffect(() => {
    if (!renameId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRenameVisible(false);
        setTimeout(() => setRenameId(null), 150);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [renameId]);

  const openRename = (wf: WorkflowSummary) => {
    setRenameId(wf.id);
    setRenameValue(getDisplayName(wf.id) ?? wf.objective);
  };

  const closeRename = () => {
    setRenameVisible(false);
    setTimeout(() => setRenameId(null), 150);
  };

  const saveRename = () => {
    if (!renameId) return;
    setDisplayName(renameId, renameValue);
    toastSuccess('Renamed');
    closeRename();
  };

  const handleStart = async (objective: string) => {
    try {
      const result = await createWorkflow(config, {
        objective,
        ...(selectedModel !== 'auto' ? { orchestrator_model: selectedModel } : {}),
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
    <div
      className="flex flex-col h-full flex-shrink-0"
      style={{ width: '100%', background: '#FAF8F4' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{
          height: 47,
          padding: '0 24px',
          borderBottom: '1px solid #E0E0E0',
          background: '#FAF8F4',
        }}
      >
        <div className="flex items-center">
          <span style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 500, color: '#111111' }}>Tasks</span>
        </div>
        <div className="flex items-center" style={{ gap: 16 }}>
          {loading && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
          {/* Coins pill */}
          <button
            type="button"
            className="flex items-center"
            style={{
              gap: 8,
              borderRadius: 8,
              padding: '8px 16px',
              border: '1px solid #E0E0E0',
              background: 'transparent',
              cursor: 'pointer',
            }}
            onClick={() => {
              if (!billing.data) {
                toastInfo('Billing', 'Connect an API key to see credits.');
                return;
              }
              toastInfo(
                `${billing.data.credits_balance.toFixed(2)} credits`,
                `Tier: ${billing.data.tier} • Period usage: ${billing.data.usage_this_period.credits_used.toFixed(2)} credits (${billing.data.usage_this_period.request_count} requests)`
              );
            }}
          >
            <Coins size={16} color="#111111" />
            <span style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 500, color: '#111111' }}>
              {billing.data ? billing.data.credits_balance.toFixed(2) : '—'}
            </span>
          </button>
          {/* Message square pill */}
          <button
            type="button"
            className="flex items-center justify-center"
            style={{
              borderRadius: 8,
              padding: '8px 12px',
              border: '1px solid #E0E0E0',
              background: 'transparent',
              cursor: 'pointer',
            }}
            onClick={() => onOpenChat?.()}
            aria-label="Open agent chat"
          >
            <MessageSquare size={16} color="#111111" />
          </button>
          {/* List filter pill */}
          <StatusFilterDropdown value={statusFilter} onChange={onStatusFilterChange} />
        </div>
      </div>

      {/* Main content area — warm background */}
      <div className="flex-1 overflow-y-auto flex flex-col hide-scrollbar" style={{ background: '#faf8f4', padding: 24, gap: 24 }}>
        {/* Start a task input */}
        <div
          className="flex flex-col flex-shrink-0"
          style={{
            borderRadius: 14,
            background: '#F4F2EF',
            border: '1px solid #E0E0E0',
            padding: '12px 14px 12px 14px',
            minHeight: 92,
            gap: 10,
          }}
        >
          <textarea
            ref={startInputRef}
            rows={1}
            placeholder="Start a task"
            onKeyDown={handleKeyDown}
            style={{
              fontFamily: 'Inter',
              fontSize: 15,
              color: '#111111',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              flex: 1,
              resize: 'none',
              minHeight: 26,
              lineHeight: 1.25,
              overflow: 'hidden',
            }}
            className="placeholder-[#A0A0A0]"
          />
          <div className="flex items-center" style={{ marginTop: 'auto' }}>
            <PlusDropdown
              outlined
              onUploadFiles={() => toastInfo('Not supported yet', 'Attachments are only supported when starting a new workflow from landing.')}
              onOpenConnectors={() => onOpenConnectors?.()}
            />
            <div style={{ flex: 1 }} />
            <button
              type="button"
              onClick={handleStartClick}
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                background: '#222222',
                border: 'none',
              }}
              aria-label="Start workflow"
            >
              <ArrowUp size={14} color="#FFFFFF" />
            </button>
          </div>
        </div>

        {/* Task list */}
        <div className="flex flex-col" style={{ gap: 8 }}>
          {sortedWorkflows.length === 0 && !loading && (
            <div style={{ textAlign: 'center', paddingTop: 48, fontFamily: 'Inter', fontSize: 14, color: '#999999' }}>
              No tasks yet. Start one above.
            </div>
          )}
          {sortedWorkflows.map((wf) => (
            <TaskItem
              key={wf.id}
              workflow={wf}
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

      {renameId && (
        <div
          className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-all duration-150 ${
            renameVisible ? 'bg-black/40' : 'bg-black/0'
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeRename();
          }}
        >
          <div
            className={`bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transition-all duration-150 ${
              renameVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-[0.98]'
            }`}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-primary">Rename workflow</h2>
              <button
                type="button"
                onClick={closeRename}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-primary hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
                aria-label="Close"
              >
                x
              </button>
            </div>

            <div className="px-5 py-5 space-y-3">
              <label className="block text-xs font-medium text-primary">Name</label>
              <input
                ref={renameInputRef}
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-primary outline-none focus:border-gray-400 transition-colors duration-150 bg-white"
              />
              <div className="text-xs text-muted" style={{ fontFamily: 'Inter' }}>
                Stored locally in this browser.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/60">
              <button
                type="button"
                onClick={closeRename}
                className="px-3.5 py-1.5 rounded-lg text-sm text-muted hover:text-primary hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveRename}
                disabled={!renameValue.trim()}
                className="px-3.5 py-1.5 rounded-lg text-sm bg-primary text-white hover:bg-gray-800 disabled:opacity-30 transition-colors duration-150 cursor-pointer disabled:cursor-default"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
