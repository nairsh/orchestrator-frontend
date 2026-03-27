import { Coins, MessageSquare, Search } from 'lucide-react';
import { StatusFilterDropdown, type WorkflowStatusFilter } from '../dropdowns/StatusFilterDropdown';
import { Button, IconButton, SearchInput } from '../ui';
import { toastInfo } from '../../lib/toast';

interface BillingSnapshot {
  data: { tier: string; credits_balance: number; usage_this_period?: { credits_used: number; request_count: number } } | null | undefined;
  error: unknown;
}

interface TaskListHeaderProps {
  showSearch: boolean;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onShowSearch: () => void;
  onHideSearch: () => void;
  loading: boolean;
  billing: BillingSnapshot;
  billingCredits: number;
  periodCreditsUsed: number;
  statusFilter: WorkflowStatusFilter;
  onStatusFilterChange: (value: WorkflowStatusFilter) => void;
  onOpenChat?: () => void;
}

export function TaskListHeader({
  showSearch,
  searchQuery,
  onSearchQueryChange,
  onShowSearch,
  onHideSearch,
  loading,
  billing,
  billingCredits,
  periodCreditsUsed,
  statusFilter,
  onStatusFilterChange,
  onOpenChat,
}: TaskListHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-shrink-0 h-12 px-6 border-b border-border-subtle bg-surface-warm">
      {showSearch ? (
        <SearchInput
          value={searchQuery}
          onChange={onSearchQueryChange}
          onEscape={() => { onHideSearch(); onSearchQueryChange(''); }}
          autoFocus
          placeholder="Search tasks…"
        />
      ) : (
        <>
          <span className="font-sans text-[15px] font-semibold text-primary">Tasks</span>
          <div className="flex items-center gap-3">
            {loading && <div className="w-1.5 h-1.5 rounded-full bg-info animate-pulse" />}

            <IconButton size="md" label="Search tasks" onClick={onShowSearch}>
              <Search size={16} className="text-muted" />
            </IconButton>

            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5"
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
                  `Your plan: ${billing.data.tier} • Used this period: ${periodCreditsUsed.toFixed(2)} credits`
                );
              }}
            >
              <Coins size={14} className="text-muted" />
              <span className="font-sans text-sm font-medium text-primary">
                {billing.data ? billingCredits.toFixed(2) : '—'}
              </span>
            </Button>

            <IconButton
              size="md"
              label="Open chat"
              onClick={() => onOpenChat?.()}
              className="border border-border-light rounded-lg px-3 py-2"
            >
              <MessageSquare size={16} className="text-muted" />
            </IconButton>

            <StatusFilterDropdown value={statusFilter} onChange={onStatusFilterChange} />
          </div>
        </>
      )}
    </div>
  );
}
