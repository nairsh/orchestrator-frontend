import { useEffect, useMemo, useState } from 'react';
import type { ApiConfig } from '../../api/client';
import { getWorkspace } from '../../api/client';
import type { WorkflowSummary } from '../../api/types';
import { Input } from '../ui/Input';
import { toastApiError, toastInfo } from '../../lib/toast';

async function resolveAuthToken(config: ApiConfig): Promise<string | null> {
  const sessionToken = config.getAuthToken ? await config.getAuthToken() : null;
  if (sessionToken && sessionToken.trim().length > 0) return sessionToken.trim();
  return null;
}

type PreviewState =
  | { kind: 'empty' }
  | { kind: 'loading'; path: string }
  | { kind: 'text'; path: string; text: string; contentType: string }
  | { kind: 'image'; path: string; url: string; contentType: string }
  | { kind: 'error'; path: string; message: string };

interface FilesPageProps {
  config: ApiConfig;
  workflows: WorkflowSummary[];
  initialWorkflowId?: string | null;
  onSelectWorkflow?: (id: string, objective: string) => void;
}

export function FilesPage({ config, workflows, initialWorkflowId, onSelectWorkflow }: FilesPageProps) {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
    initialWorkflowId ?? workflows[0]?.id ?? null
  );
  const [workspace, setWorkspace] = useState<Record<string, unknown> | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewState>({ kind: 'empty' });
  const [filter, setFilter] = useState('');

  const sessionId = typeof workspace?.active_session_id === 'string' ? (workspace.active_session_id as string) : null;

  const filteredFiles = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return files;
    return files.filter((p) => p.toLowerCase().includes(q));
  }, [files, filter]);

  useEffect(() => {
    if (!selectedWorkflowId) return;
    const hasAuth = Boolean(config.hasAuth);
    if (!hasAuth) {
      setWorkspace(null);
      setFiles([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setPreview({ kind: 'empty' });

    getWorkspace(config, selectedWorkflowId)
      .then((res) => {
        if (cancelled) return;
        setWorkspace(res.workspace);
        setFiles(res.created_files ?? res.files ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setWorkspace(null);
        setFiles([]);
        toastApiError(err, 'Failed to load workspace');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [config.baseUrl, config.hasAuth, selectedWorkflowId]);

  useEffect(() => {
    return () => {
      if (preview.kind === 'image') {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [preview]);

  const openFile = async (path: string) => {
    if (!sessionId) {
      toastInfo('Workspace inactive', 'No active sandbox session for this workflow yet.');
      return;
    }

    if (preview.kind === 'image') {
      URL.revokeObjectURL(preview.url);
    }

    setPreview({ kind: 'loading', path });

    const safePath = path
      .split('/')
      .map((seg) => encodeURIComponent(seg))
      .join('/');

    const url = `${config.baseUrl.replace(/\/$/, '')}/v1/sandbox/sessions/${encodeURIComponent(sessionId)}/file/${safePath}`;

    try {
      const token = await resolveAuthToken(config);
      const res = await fetch(url, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
      if (contentType.startsWith('image/')) {
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        setPreview({ kind: 'image', path, url: objectUrl, contentType });
        return;
      }

      const text = await res.text();
      setPreview({ kind: 'text', path, text: text.slice(0, 200_000), contentType });
    } catch (err) {
      setPreview({ kind: 'error', path, message: err instanceof Error ? err.message : String(err) });
      toastApiError(err, 'Failed to open file');
    }
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* Left: workflow selector */}
      <div className="flex flex-col h-full flex-shrink-0 w-[360px] bg-surface-secondary border-r border-border">
        <div className="flex items-center justify-between flex-shrink-0 h-12 px-5 border-b border-border">
          <span className="font-sans text-[16px] font-medium text-primary">Files</span>
          {loading && <div className="w-1.5 h-1.5 rounded-full bg-info animate-pulse" />}
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-surface-warm">
          <div className="font-sans text-xs text-muted mb-2.5">
            Select a workflow workspace
          </div>

          <div className="flex flex-col gap-1.5">
            {workflows.map((wf) => (
              <button
                key={wf.id}
                type="button"
                onClick={() => {
                  setSelectedWorkflowId(wf.id);
                  onSelectWorkflow?.(wf.id, wf.objective);
                }}
                className={[
                  'w-full text-left rounded-lg px-3 py-2.5 border border-border-light transition-colors duration-fast cursor-pointer',
                  wf.id === selectedWorkflowId ? 'bg-surface shadow-xs' : 'bg-transparent hover:bg-surface-hover',
                ].join(' ')}
              >
                <div className="font-sans text-sm font-medium text-primary">
                  {wf.objective.slice(0, 60)}{wf.objective.length > 60 ? '...' : ''}
                </div>
                <div className="font-sans text-xs text-muted mt-0.5">
                  {wf.id}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Middle: file list */}
      <div className="flex flex-col h-full flex-shrink-0 w-[380px] bg-surface border-r border-border-light">
        <div className="flex items-center justify-between flex-shrink-0 h-12 px-5 border-b border-border-light">
          <span className="font-sans text-base font-medium text-primary">Created files</span>
          <span className="font-sans text-xs text-muted">
            {sessionId ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="p-4 border-b border-border-subtle">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter created files..."
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredFiles.length === 0 ? (
            <div className="font-sans text-sm text-muted">
              {files.length === 0 ? 'No files created through workflows yet.' : 'No matches.'}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {filteredFiles.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => void openFile(p)}
                  className={[
                    'w-full text-left rounded-lg px-2.5 py-2 border border-border-subtle font-sans text-sm text-primary truncate transition-colors duration-fast cursor-pointer',
                    preview.kind !== 'empty' && 'path' in preview && preview.path === p
                      ? 'bg-surface-hover'
                      : 'bg-transparent hover:bg-surface-hover',
                  ].join(' ')}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: preview */}
      <div className="flex flex-col flex-1 h-full min-w-0 bg-surface">
        <div className="flex items-center justify-between flex-shrink-0 h-12 px-5 border-b border-border-light">
          <span className="font-sans text-base font-medium text-primary">Preview</span>
          <span className="font-sans text-xs text-muted">
            {preview.kind !== 'empty' && 'path' in preview ? preview.path : ''}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {preview.kind === 'empty' && (
            <div className="font-sans text-sm text-muted">
              Select a file to preview.
            </div>
          )}
          {preview.kind === 'loading' && (
            <div className="font-sans text-sm text-muted">Loading...</div>
          )}
          {preview.kind === 'error' && (
            <div className="font-sans text-sm text-danger">{preview.message}</div>
          )}
          {preview.kind === 'image' && (
            <img
              src={preview.url}
              alt={preview.path}
              className="max-w-full rounded-lg border border-border-light"
            />
          )}
          {preview.kind === 'text' && (
            <pre className="font-mono text-xs leading-normal text-primary whitespace-pre-wrap m-0">
              {preview.text}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
