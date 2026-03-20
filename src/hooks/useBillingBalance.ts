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
    if (!enabled || !config.apiKey) return;
    try {
      const bal = await getBillingBalance(config);
      setData(bal);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [config, enabled]);

  useEffect(() => {
    if (!enabled || !config.apiKey) {
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
  }, [enabled, config.apiKey, config.baseUrl, fetch_]);

  return { data, loading, error, refresh: fetch_ };
}
