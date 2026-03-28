import { useCallback, useMemo, useRef, useState } from 'react';

export interface WorkflowMeta {
  pinned?: boolean;
  display_name?: string;
}

export type WorkflowMetaMap = Record<string, WorkflowMeta>;

const STORAGE_KEY = 'relay_workflow_meta_v1';

function loadMeta(): WorkflowMetaMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as WorkflowMetaMap;
  } catch {
    return {};
  }
}

export function useWorkflowMeta() {
  const [meta, setMeta] = useState<WorkflowMetaMap>(() => loadMeta());
  const metaRef = useRef(meta);
  metaRef.current = meta;

  const persist = useCallback((next: WorkflowMetaMap) => {
    setMeta(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage failures
    }
  }, []);

  const togglePin = useCallback(
    (workflowId: string) => {
      const m = metaRef.current;
      persist({
        ...m,
        [workflowId]: {
          ...(m[workflowId] ?? {}),
          pinned: !(m[workflowId]?.pinned ?? false),
        },
      });
    },
    [persist]
  );

  const setDisplayName = useCallback(
    (workflowId: string, displayName: string | null) => {
      const m = metaRef.current;
      const trimmed = (displayName ?? '').trim();
      const next: WorkflowMetaMap = {
        ...m,
        [workflowId]: {
          ...(m[workflowId] ?? {}),
          display_name: trimmed || undefined,
        },
      };

      // Avoid storing empty entries.
      if (!next[workflowId]?.pinned && !next[workflowId]?.display_name) {
        delete next[workflowId];
      }

      persist(next);
    },
    [persist]
  );

  // Stable callbacks — read from metaRef so they don't recreate on every meta change
  const getDisplayName = useCallback(
    (workflowId: string) => metaRef.current[workflowId]?.display_name,
    []
  );

  const isPinned = useCallback(
    (workflowId: string) => metaRef.current[workflowId]?.pinned ?? false,
    []
  );

  const sortKey = useCallback(
    (workflowId: string) => (metaRef.current[workflowId]?.pinned ? 0 : 1),
    []
  );

  const api = useMemo(
    () => ({ meta, togglePin, setDisplayName, getDisplayName, isPinned, sortKey }),
    [meta, togglePin, setDisplayName, getDisplayName, isPinned, sortKey]
  );

  return api;
}
