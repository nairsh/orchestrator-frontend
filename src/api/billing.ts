import type { BillingBalanceResponse, BillingUsageEntry, BillingTransaction } from './types';
import type { ApiConfig } from './core';
import { request } from './core';

export async function getBillingBalance(config: ApiConfig): Promise<BillingBalanceResponse> {
  return request<BillingBalanceResponse>(config, '/v1/billing/balance');
}

export async function getBillingUsage(
  config: ApiConfig,
  params?: { period?: string; group_by?: string }
): Promise<{ usage: BillingUsageEntry[]; period: string }> {
  const sp = new URLSearchParams();
  if (params?.period) sp.set('period', params.period);
  if (params?.group_by) sp.set('group_by', params.group_by);
  const qs = sp.toString();
  return request<{ usage: BillingUsageEntry[]; period: string }>(config, `/v1/billing/usage${qs ? `?${qs}` : ''}`);
}

export async function getBillingTransactions(
  config: ApiConfig,
  params?: { page?: number; limit?: number }
): Promise<{ transactions: BillingTransaction[]; total: number }> {
  const sp = new URLSearchParams();
  if (typeof params?.page === 'number') sp.set('page', String(params.page));
  if (typeof params?.limit === 'number') sp.set('limit', String(params.limit));
  const qs = sp.toString();
  return request<{ transactions: BillingTransaction[]; total: number }>(config, `/v1/billing/transactions${qs ? `?${qs}` : ''}`);
}

export async function topUpCredits(
  config: ApiConfig,
  amount: number
): Promise<{ credits_balance: number }> {
  return request<{ credits_balance: number }>(config, '/v1/billing/top-up', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}
