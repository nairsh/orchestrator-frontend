import { useCallback, useMemo, useState } from 'react';

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
      persist({
        ...meta,
        [workflowId]: {
          ...(meta[workflowId] ?? {}),
          pinned: !(meta[workflowId]?.pinned ?? false),
        },
      });
    },
    [meta, persist]
  );

  const setDisplayName = useCallback(
    (workflowId: string, displayName: string | null) => {
      const trimmed = (displayName ?? '').trim();
      const next: WorkflowMetaMap = {
        ...meta,
        [workflowId]: {
          ...(meta[workflowId] ?? {}),
          display_name: trimmed || undefined,
        },
      };

      // Avoid storing empty entries.
      if (!next[workflowId]?.pinned && !next[workflowId]?.display_name) {
        delete next[workflowId];
      }

      persist(next);
    },
    [meta, persist]
  );

  const getDisplayName = useCallback(
    (workflowId: string) => meta[workflowId]?.display_name,
    [meta]
  );

  const isPinned = useCallback(
    (workflowId: string) => meta[workflowId]?.pinned ?? false,
    [meta]
  );

  const sortKey = useCallback(
    (workflowId: string) => (isPinned(workflowId) ? 0 : 1),
    [isPinned]
  );

  const api = useMemo(
    () => ({ meta, togglePin, setDisplayName, getDisplayName, isPinned, sortKey }),
    [meta, togglePin, setDisplayName, getDisplayName, isPinned, sortKey]
  );

  return api;
}
