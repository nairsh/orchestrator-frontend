import { useEffect, useState } from 'react';
import type { ApiConfig } from '../api/client';
import { getModels } from '../api/client';
import { toastWarning } from '../lib/toast';

const DEFAULT_MODEL = 'openai/gpt-4o';

/**
 * Resolve the best default chat model from the API.
 * Returns [model, setModel] — the initial value is a sensible default
 * that gets upgraded to the server's preferred model once fetched.
 */
export function useChatModel(config: ApiConfig): [string, (m: string) => void] {
  const [model, setModel] = useState(DEFAULT_MODEL);

  useEffect(() => {
    let cancelled = false;
    getModels(config)
      .then((res) => {
        if (cancelled) return;
        const ids = new Set(res.models.map((m) => m.id));
        const preferred =
          (res.default_orchestrator_model && ids.has(res.default_orchestrator_model)
            ? res.default_orchestrator_model
            : res.models[0]?.id) ?? DEFAULT_MODEL;
        setModel((prev) => ids.has(prev) ? prev : preferred);
      })
      .catch(() => {
        if (!cancelled) toastWarning('Models unavailable', 'Using default model — check your API settings.');
      });
    return () => { cancelled = true; };
  }, [config.baseUrl]);

  return [model, setModel];
}
