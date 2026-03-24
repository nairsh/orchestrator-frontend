import { useEffect, useMemo, useState } from 'react';
import { FileSearch, ImageIcon, Loader2, ScanSearch, Search, Trash2, UploadCloud } from 'lucide-react';
import type { ApiConfig } from '../../api/client';
import { deleteKnowledgeDocument, getKnowledgeDocument, getWorkspace, listKnowledgeDocuments, searchKnowledge, uploadKnowledgeDocument } from '../../api/client';
import type { KnowledgeDocument, KnowledgeSearchMatch, WorkflowSummary } from '../../api/types';
import { fileToContextUpload, MAX_CONTEXT_FILE_BYTES } from '../../lib/files';
import { toastApiError, toastInfo, toastSuccess, toastWarning } from '../../lib/toast';
import { Button, Input } from '../ui';

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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesPage({ config, workflows, initialWorkflowId, onSelectWorkflow }: FilesPageProps) {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(initialWorkflowId ?? workflows[0]?.id ?? null);
  const [workspace, setWorkspace] = useState<Record<string, unknown> | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewState>({ kind: 'empty' });
  const [filter, setFilter] = useState('');

  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [documentContent, setDocumentContent] = useState('');
  const [documentLoading, setDocumentLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<KnowledgeSearchMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);

  const sessionId = typeof workspace?.active_session_id === 'string' ? (workspace.active_session_id as string) : null;

  const filteredFiles = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return files;
    return files.filter((p) => p.toLowerCase().includes(q));
  }, [files, filter]);

  const selectedDocument = useMemo(
    () => (selectedDocumentId ? documents.find((document) => document.id === selectedDocumentId) ?? null : null),
    [documents, selectedDocumentId]
  );

  const refreshKnowledgeDocuments = async () => {
    if (!config.hasAuth) return;
    setDocumentsLoading(true);
    try {
      const response = await listKnowledgeDocuments(config);
      const nextDocuments = response.documents ?? [];
      setDocuments(nextDocuments);
      setSelectedDocumentId((current) => (current && nextDocuments.some((document) => document.id === current) ? current : nextDocuments[0]?.id ?? null));
    } catch (err) {
      toastApiError(err, 'Failed to load knowledge library');
    } finally {
      setDocumentsLoading(false);
    }
  };

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
    void refreshKnowledgeDocuments();
  }, [config.baseUrl, config.hasAuth]);

  useEffect(() => {
    return () => {
      if (preview.kind === 'image') {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [preview]);

  useEffect(() => {
    if (!selectedDocumentId || !config.hasAuth) {
      setDocumentContent('');
      return;
    }

    let cancelled = false;
    setDocumentLoading(true);
    getKnowledgeDocument(config, selectedDocumentId)
      .then((response) => {
        if (cancelled) return;
        setDocumentContent(response.content);
      })
      .catch((err) => {
        if (cancelled) return;
        setDocumentContent('');
        toastApiError(err, 'Failed to load document');
      })
      .finally(() => {
        if (!cancelled) setDocumentLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDocumentId, config.baseUrl, config.hasAuth]);

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

  const handleUploadDocuments = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        if (file.size > MAX_CONTEXT_FILE_BYTES) {
          toastWarning('File too large', `${file.name} exceeds ${Math.round(MAX_CONTEXT_FILE_BYTES / (1024 * 1024))}MB.`);
          continue;
        }
        const upload = await fileToContextUpload(file);
        await uploadKnowledgeDocument(config, upload);
      }
      toastSuccess('Knowledge library updated');
      await refreshKnowledgeDocuments();
    } catch (err) {
      toastApiError(err, 'Failed to upload knowledge document');
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchMatches([]);
      return;
    }
    setSearching(true);
    try {
      const response = await searchKnowledge(config, { query, limit: 8 });
      setSearchMatches(response.matches ?? []);
    } catch (err) {
      toastApiError(err, 'Failed to search knowledge');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="flex h-full flex-1 overflow-hidden bg-surface-warm">
      <div className="flex h-full w-[340px] flex-shrink-0 flex-col border-r border-border bg-surface-secondary">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <span className="text-base font-medium text-primary">Workflow Files</span>
          {loading && <Loader2 size={14} className="animate-spin text-muted" />}
        </div>

        <div className="flex-1 overflow-y-auto bg-surface-warm p-4">
          <div className="mb-2.5 text-xs text-muted">Select a workflow workspace</div>
          <div className="flex flex-col gap-1.5">
            {workflows.map((workflow) => (
              <button
                key={workflow.id}
                type="button"
                onClick={() => {
                  setSelectedWorkflowId(workflow.id);
                  onSelectWorkflow?.(workflow.id, workflow.objective);
                }}
                className={[
                  'w-full rounded-xl border border-border-light px-3 py-2.5 text-left transition-colors duration-150',
                  workflow.id === selectedWorkflowId ? 'bg-surface shadow-sm' : 'bg-transparent hover:bg-surface-hover',
                ].join(' ')}
              >
                <div className="text-sm font-medium text-primary">{workflow.objective.slice(0, 60)}{workflow.objective.length > 60 ? '...' : ''}</div>
                <div className="mt-1 text-xs text-muted">{workflow.id}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex h-full w-[360px] flex-shrink-0 flex-col border-r border-border-light bg-surface">
        <div className="flex items-center justify-between border-b border-border-light px-5 py-4">
          <span className="text-base font-medium text-primary">Created files</span>
          <span className="text-xs text-muted">{sessionId ? 'Active' : 'Inactive'}</span>
        </div>

        <div className="border-b border-border-subtle p-4">
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter created files..." />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredFiles.length === 0 ? (
            <div className="text-sm text-muted">{files.length === 0 ? 'No files created through workflows yet.' : 'No matches.'}</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {filteredFiles.map((path) => (
                <button
                  key={path}
                  type="button"
                  onClick={() => void openFile(path)}
                  className={[
                    'truncate rounded-xl border border-border-subtle px-3 py-2 text-left text-sm text-primary transition-colors duration-150',
                    preview.kind !== 'empty' && 'path' in preview && preview.path === path ? 'bg-surface-hover' : 'bg-transparent hover:bg-surface-hover',
                  ].join(' ')}
                >
                  {path}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col border-r border-border-light bg-surface">
        <div className="flex items-center justify-between border-b border-border-light px-5 py-4">
          <span className="text-base font-medium text-primary">Preview</span>
          <span className="text-xs text-muted">{preview.kind !== 'empty' && 'path' in preview ? preview.path : ''}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {preview.kind === 'empty' && <div className="text-sm text-muted">Select a file to preview.</div>}
          {preview.kind === 'loading' && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Loader2 size={16} className="animate-spin" />
              Loading preview…
            </div>
          )}
          {preview.kind === 'error' && <div className="text-sm text-danger">{preview.message}</div>}
          {preview.kind === 'image' && <img src={preview.url} alt={preview.path} className="max-w-full rounded-lg border border-border-light" />}
          {preview.kind === 'text' && <pre className="m-0 whitespace-pre-wrap font-mono text-xs leading-normal text-primary">{preview.text}</pre>}
        </div>
      </div>

      <div className="flex h-full w-[420px] flex-shrink-0 flex-col bg-surface-secondary">
        <div className="border-b border-border-light px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-base font-medium text-primary">Knowledge Library</div>
              <div className="mt-1 text-xs text-muted">Upload text, PDF, and image files for embedding + OCR-backed retrieval.</div>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary hover:bg-surface-hover">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
              Upload
              <input type="file" multiple className="hidden" onChange={(event) => void handleUploadDocuments(event.target.files)} />
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search your knowledge base" className="flex-1" />
            <Button variant="secondary" onClick={() => void handleSearch()}>
              {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Search
            </Button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-h-0 border-b border-border-light p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.16em] text-muted">Documents</div>
              <Button variant="ghost" onClick={() => void refreshKnowledgeDocuments()}>
                {documentsLoading ? <Loader2 size={14} className="animate-spin" /> : 'Refresh'}
              </Button>
            </div>

            <div className="flex h-full flex-col gap-2 overflow-y-auto">
              {documents.length === 0 ? (
                <div className="rounded-2xl border border-border-light bg-surface px-4 py-4 text-sm text-muted">No documents ingested yet.</div>
              ) : (
                documents.map((document) => (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => setSelectedDocumentId(document.id)}
                    className={[
                      'rounded-2xl border px-4 py-3 text-left transition-colors duration-150',
                      selectedDocumentId === document.id ? 'border-border bg-surface text-primary shadow-sm' : 'border-border-light bg-surface-secondary text-secondary hover:bg-surface',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-primary">{document.filename}</div>
                        <div className="mt-1 text-xs text-muted">{document.extraction_mode} • {document.chunk_count} chunks • {formatBytes(document.byte_size)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={async (event) => {
                          event.stopPropagation();
                          try {
                            await deleteKnowledgeDocument(config, document.id);
                            toastSuccess('Document removed');
                            await refreshKnowledgeDocuments();
                          } catch (err) {
                            toastApiError(err, 'Failed to delete document');
                          }
                        }}
                        className="rounded-lg p-1 text-muted hover:bg-surface hover:text-danger"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="min-h-0 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted">
              <FileSearch size={13} />
              {searchMatches.length > 0 ? 'Search matches' : 'Document viewer'}
            </div>

            {searchMatches.length > 0 ? (
              <div className="flex h-full flex-col gap-2 overflow-y-auto">
                {searchMatches.map((match) => (
                  <button
                    key={match.chunk_id}
                    type="button"
                    onClick={() => {
                      setSelectedDocumentId(match.document_id);
                      setSearchMatches([]);
                    }}
                    className="rounded-2xl border border-border-light bg-surface px-4 py-3 text-left hover:bg-surface-hover"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      {match.extraction_mode === 'ocr' ? <ScanSearch size={14} /> : match.extraction_mode === 'document' ? <ImageIcon size={14} /> : <FileSearch size={14} />}
                      {match.filename}
                    </div>
                    <div className="mt-1 text-xs text-muted">Similarity {(match.score * 100).toFixed(1)}%</div>
                    <div className="mt-2 line-clamp-4 whitespace-pre-wrap text-xs leading-5 text-secondary">{match.content}</div>
                  </button>
                ))}
              </div>
            ) : selectedDocument ? (
              <div className="flex h-full flex-col rounded-[24px] border border-border-light bg-surface">
                <div className="border-b border-border-light px-4 py-3">
                  <div className="text-sm font-medium text-primary">{selectedDocument.filename}</div>
                  <div className="mt-1 text-xs text-muted">{selectedDocument.extraction_mode} • {selectedDocument.status}</div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  {documentLoading ? (
                    <div className="text-sm text-muted">Loading document...</div>
                  ) : (
                    <pre className="m-0 whitespace-pre-wrap font-sans text-sm leading-6 text-primary">{documentContent}</pre>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border-light bg-surface px-4 py-4 text-sm text-muted">Upload a document or select one to inspect extracted content.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
