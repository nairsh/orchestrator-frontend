import type { ApiConfig } from '../../api/client';
import type { WorkflowSummary } from '../../api/types';

export type PreviewState =
  | { kind: 'empty' }
  | { kind: 'loading'; path: string }
  | { kind: 'text'; path: string; text: string; contentType: string }
  | { kind: 'image'; path: string; url: string; contentType: string }
  | { kind: 'error'; path: string; message: string };

export interface FilesPageProps {
  config: ApiConfig;
  workflows: WorkflowSummary[];
  initialWorkflowId?: string | null;
  onSelectWorkflow?: (id: string, objective: string) => void;
}

export type FileTab = 'all' | 'workflows' | 'knowledge';

export const FILE_TABS: { id: FileTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'workflows', label: 'Task files' },
  { id: 'knowledge', label: 'Knowledge library' },
];

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export async function resolveAuthToken(config: ApiConfig): Promise<string | null> {
  const sessionToken = config.getAuthToken ? await config.getAuthToken() : null;
  if (sessionToken && sessionToken.trim().length > 0) return sessionToken.trim();
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
