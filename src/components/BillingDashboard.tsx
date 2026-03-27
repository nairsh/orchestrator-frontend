import { useState, useEffect } from 'react';
import { BarChart3, CreditCard, ArrowDownCircle, ArrowUpCircle, Loader2, RefreshCw } from 'lucide-react';
import { Empty, Tooltip, Tabs } from '@lobehub/ui';
import type { ApiConfig } from '../api/client';
import type { BillingUsageEntry, BillingTransaction } from '../api/types';
import { getBillingUsage, getBillingTransactions, getBillingBalance } from '../api/client';
import { Button } from './ui/Button';

import { humanizeModelName } from '../lib/modelNames';

interface BillingDashboardProps {
  config: ApiConfig;
}

function formatCredits(n: number): string {
  return n.toFixed(2);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function BillingDashboard({ config }: BillingDashboardProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [tier, setTier] = useState('');
  const [usage, setUsage] = useState<BillingUsageEntry[]>([]);
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'usage' | 'transactions'>('usage');

  const fetchAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [balRes, usageRes, txRes] = await Promise.allSettled([
        getBillingBalance(config),
        getBillingUsage(config),
        getBillingTransactions(config, { limit: 20 }),
      ]);
      if (balRes.status === 'fulfilled') {
        setBalance(balRes.value.credits_balance);
        setTier(balRes.value.tier);
      }
      if (usageRes.status === 'fulfilled') setUsage(usageRes.value.usage ?? []);
      if (txRes.status === 'fulfilled') setTransactions(txRes.value.transactions ?? []);
    } finally {
      if (isRefresh) setRefreshing(false); else setLoading(false);
    }
  };

  useEffect(() => { void fetchAll(); }, [config.baseUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-muted" />
      </div>
    );
  }

  const totalUsed = usage.reduce((sum, u) => sum + u.credits_used, 0);
  const maxUsage = Math.max(...usage.map((u) => u.credits_used), 1);

  return (
    <div className="space-y-4">
      {/* Balance summary */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-secondary/50 border border-border-light">
        <div className="w-10 h-10 rounded-xl bg-surface-tertiary flex items-center justify-center">
          <CreditCard size={20} className="text-info" />
        </div>
        <div className="flex-1">
          <div className="text-lg font-semibold text-primary">{balance !== null ? formatCredits(balance) : '—'} credits</div>
          <div className="text-xs text-muted">Plan: {tier || 'unknown'} • Used this period: {formatCredits(totalUsed)}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void fetchAll(true)} disabled={refreshing} className="gap-1.5">
          {refreshing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        activeKey={tab}
        onChange={(key) => setTab(key as 'usage' | 'transactions')}
        variant="rounded"
        compact
        items={[
          { key: 'usage', label: <span className="inline-flex items-center gap-1.5"><BarChart3 size={14} />Usage by AI</span> },
          { key: 'transactions', label: <span className="inline-flex items-center gap-1.5"><CreditCard size={14} />Transactions</span> },
        ]}
      />

      {/* Usage breakdown */}
      {tab === 'usage' && (
        <div className="space-y-2">
          {usage.length === 0 ? (
            <div className="py-4">
              <Empty description="No usage recorded yet. Start a task to see your usage breakdown." />
            </div>
          ) : (
            usage.map((u) => (
              <div key={u.model} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors duration-200">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-primary truncate">{humanizeModelName(u.model)}</div>
                  <div className="text-2xs text-muted">{u.request_count} {u.request_count === 1 ? 'task' : 'tasks'}</div>
                </div>
                <Tooltip title={`${formatCredits(u.credits_used)} / ${formatCredits(maxUsage)} credits`}>
                  <div className="w-24 h-2 rounded-full bg-surface-tertiary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-info transition-all duration-200"
                      style={{ width: `${(u.credits_used / maxUsage) * 100}%` }}
                    />
                  </div>
                </Tooltip>
                <span className="text-xs font-mono text-muted w-16 text-right">{formatCredits(u.credits_used)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Transactions */}
      {tab === 'transactions' && (
        <div className="space-y-1">
          {transactions.length === 0 ? (
            <div className="py-4">
              <Empty description="No transactions yet. Credit activity will appear here." />
            </div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors duration-200">
                {tx.type === 'debit' ? (
                  <ArrowDownCircle size={16} className="text-danger flex-shrink-0" />
                ) : (
                  <ArrowUpCircle size={16} className="text-success flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-primary truncate">{tx.description}</div>
                  <div className="text-2xs text-muted">{formatDate(tx.created_at)}</div>
                </div>
                <span className={`text-xs font-mono ${tx.type === 'debit' ? 'text-danger' : 'text-success'}`}>
                  {tx.type === 'debit' ? '-' : '+'}{formatCredits(Math.abs(tx.amount))}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
