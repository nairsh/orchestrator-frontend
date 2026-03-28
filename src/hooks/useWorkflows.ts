import { useState, useEffect, useCallback, useRef } from 'react';
import { listWorkflows } from '../api/client';
import type { ApiConfig } from '../api/client';
import type { WorkflowSummary } from '../api/types';
import { humanizeError } from '../lib/humanizeError';

const POLL_INTERVAL = 5000;

export function useWorkflows(config: ApiConfig, enabled: boolean, status?: string) {
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch_ = useCallback(async () => {
    const hasAuth = Boolean(config.hasAuth);
    if (!enabled || !hasAuth) return;
    try {
      const result = await listWorkflows(config, { status });
      setWorkflows(result.workflows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? humanizeError(err.message) : String(err));
    } finally {
      setLoading(false);
    }
  }, [config, enabled, status]);

  useEffect(() => {
    if (!enabled || !config.hasAuth) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetch_();

    timerRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetch_();
      }
    }, POLL_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetch_, enabled, config.hasAuth]);

  const refresh = useCallback(() => {
    void fetch_();
  }, [fetch_]);

  return { workflows, loading, error, refresh };
}
