import { createElement } from 'react';
import { Coins, MessageSquare, Search } from 'lucide-react';
import { StatusFilterDropdown, type WorkflowStatusFilter } from '../dropdowns/StatusFilterDropdown';
import { Button, IconButton, SearchInput } from '../ui';
import { toastInfo } from '../../lib/toast';
import { sileo } from 'sileo';

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
                const total = billingCredits + periodCreditsUsed;
                const pct = total > 0 ? Math.round((billingCredits / total) * 100) : 100;
                const hasUsageData = periodCreditsUsed > 0;
                const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

                sileo.info({
                  title: `${billingCredits.toFixed(0)} credits remaining`,
                  duration: 5000,
                  roundness: 20,
                  fill: isDark ? '#282624' : '#ffffff',
                  styles: { title: 'relay-toast-title', description: 'relay-toast-description' },
                  description: createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' } },
                    hasUsageData
                      ? createElement('div', { style: { width: '100%', height: '6px', borderRadius: '3px', background: isDark ? '#3a3836' : '#e8e5e0', overflow: 'hidden' } },
                          createElement('div', { style: { width: `${pct}%`, height: '100%', borderRadius: '3px', background: pct > 20 ? '#6b8f71' : '#c4573a', transition: 'width 0.4s ease' } })
                        )
                      : null,
                    hasUsageData
                      ? createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: isDark ? '#b0aca6' : '#706b64' } },
                          createElement('span', null, `${pct}% remaining`),
                          createElement('span', null, `${periodCreditsUsed.toFixed(0)} used`)
                        )
                      : createElement('div', { style: { fontSize: '12px', color: isDark ? '#b0aca6' : '#706b64' } },
                          `${billingCredits.toFixed(0)} credits available`
                        ),
                    createElement('div', { style: { fontSize: '11px', color: isDark ? '#8a8580' : '#918b84', marginTop: '2px' } },
                      `Plan: ${billing.data.tier}`
                    )
                  ),
                });
              }}
            >
              <Coins size={14} className="text-muted" />
              <span className="font-sans text-sm font-medium text-primary">
                {billing.data ? `${billingCredits.toFixed(0)} credits` : '—'}
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
