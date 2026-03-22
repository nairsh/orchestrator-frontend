import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiConfig } from '../api/client';
import { getBillingBalance } from '../api/client';
import type { BillingBalanceResponse } from '../api/types';

const POLL_INTERVAL_MS = 15_000;

export function useBillingBalance(config: ApiConfig, enabled: boolean) {
  const [data, setData] = useState<BillingBalanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch_ = useCallback(async () => {
    const hasAuth = Boolean(config.hasAuth);
    if (!enabled || !hasAuth) return;
    try {
      const bal = await getBillingBalance(config);
      setData(normalizeBalance(bal));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [config, enabled]);

  useEffect(() => {
    const hasAuth = Boolean(config.hasAuth);
    if (!enabled || !hasAuth) {
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    void fetch_();

    timerRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetch_();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, config.baseUrl, config.hasAuth, fetch_]);

  return { data, loading, error, refresh: fetch_ };
}

function normalizeBalance(input: BillingBalanceResponse): BillingBalanceResponse {
  const creditsBalance = toFiniteNumber(input.credits_balance, 0);
  const creditsUsed = toFiniteNumber(input.usage_this_period?.credits_used, 0);
  const requestCount = toFiniteNumber(input.usage_this_period?.request_count, 0);

  return {
    ...input,
    credits_balance: creditsBalance,
    usage_this_period: {
      ...input.usage_this_period,
      credits_used: creditsUsed,
      request_count: Math.max(0, Math.trunc(requestCount)),
    },
  };
}

function toFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
