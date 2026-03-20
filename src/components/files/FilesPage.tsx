import { useEffect, useMemo, useState } from 'react';
import type { ApiConfig } from '../../api/client';
import { getWorkspace } from '../../api/client';
import type { WorkflowSummary } from '../../api/types';
import { toastApiError, toastInfo } from '../../lib/toast';

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
    if (!config.apiKey) {
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
  }, [config.baseUrl, config.apiKey, selectedWorkflowId]);

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

    // Revoke any prior object URL.
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
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
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
      <div
        className="flex flex-col h-full flex-shrink-0"
        style={{ width: 360, background: '#F7F7F8', borderRight: '1px solid #E0E0E0' }}
      >
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{ height: 47, padding: '0 20px', borderBottom: '1px solid #E0E0E0' }}
        >
          <span style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 500, color: '#111111' }}>Files</span>
          {loading && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
        </div>

        <div className="flex-1 overflow-y-auto" style={{ padding: 16, background: '#faf8f4' }}>
          <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#666666', marginBottom: 10 }}>
            Select a workflow workspace
          </div>

          <div className="flex flex-col" style={{ gap: 6 }}>
            {workflows.map((wf) => (
              <button
                key={wf.id}
                type="button"
                onClick={() => {
                  setSelectedWorkflowId(wf.id);
                  onSelectWorkflow?.(wf.id, wf.objective);
                }}
                className="w-full text-left"
                style={{
                  borderRadius: 10,
                  padding: '10px 12px',
                  border: '1px solid #E6E6E6',
                  background: wf.id === selectedWorkflowId ? '#FFFFFF' : 'transparent',
                  boxShadow: wf.id === selectedWorkflowId ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                <div style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 500, color: '#111111' }}>
                  {wf.objective.slice(0, 60)}{wf.objective.length > 60 ? '...' : ''}
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#888888', marginTop: 2 }}>
                  {wf.id}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Middle: file list */}
      <div
        className="flex flex-col h-full flex-shrink-0"
        style={{ width: 380, background: '#FFFFFF', borderRight: '1px solid #EBEBEB' }}
      >
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{ height: 47, padding: '0 20px', borderBottom: '1px solid #EBEBEB' }}
        >
          <span style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 500, color: '#111111' }}>Created files</span>
          <span style={{ fontFamily: 'Inter', fontSize: 12, color: '#666666' }}>
            {sessionId ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div style={{ padding: 16, borderBottom: '1px solid #F2F0EB' }}>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter created files..."
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-primary outline-none focus:border-gray-400 transition-colors duration-150 bg-white"
          />
        </div>

        <div className="flex-1 overflow-y-auto" style={{ padding: 16 }}>
          {filteredFiles.length === 0 ? (
            <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#888888' }}>
              {files.length === 0 ? 'No files created through workflows yet.' : 'No matches.'}
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: 6 }}>
              {filteredFiles.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => void openFile(p)}
                  className="w-full text-left"
                  style={{
                    borderRadius: 10,
                    padding: '8px 10px',
                    border: '1px solid #F2F0EB',
                    background: preview.kind !== 'empty' && 'path' in preview && preview.path === p ? '#F5F5F5' : 'transparent',
                    fontFamily: 'Inter',
                    fontSize: 13,
                    color: '#111111',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: preview */}
      <div className="flex flex-col flex-1 h-full min-w-0" style={{ background: '#FFFFFF' }}>
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{ height: 47, padding: '0 20px', borderBottom: '1px solid #EBEBEB' }}
        >
          <span style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 500, color: '#111111' }}>Preview</span>
          <span style={{ fontFamily: 'Inter', fontSize: 12, color: '#666666' }}>
            {preview.kind !== 'empty' && 'path' in preview ? preview.path : ''}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ padding: 20 }}>
          {preview.kind === 'empty' && (
            <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#888888' }}>
              Select a file to preview.
            </div>
          )}
          {preview.kind === 'loading' && (
            <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#888888' }}>Loading...</div>
          )}
          {preview.kind === 'error' && (
            <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#EF4444' }}>{preview.message}</div>
          )}
          {preview.kind === 'image' && (
            <img
              src={preview.url}
              alt={preview.path}
              style={{ maxWidth: '100%', borderRadius: 12, border: '1px solid #E6E6E6' }}
            />
          )}
          {preview.kind === 'text' && (
            <pre
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: 12,
                lineHeight: 1.5,
                color: '#111111',
                whiteSpace: 'pre-wrap',
                margin: 0,
              }}
            >
              {preview.text}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
