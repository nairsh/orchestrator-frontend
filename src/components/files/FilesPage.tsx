import { useEffect, useMemo, useState } from 'react';
import { FileSearch, ImageIcon, Loader2, ScanSearch, Search, Trash2, UploadCloud } from 'lucide-react';
import { Highlighter } from '@lobehub/ui';
import type { ApiConfig } from '../../api/client';
import { deleteKnowledgeDocument, getKnowledgeDocument, getWorkspace, listKnowledgeDocuments, searchKnowledge, uploadKnowledgeDocument } from '../../api/client';
import type { KnowledgeDocument, KnowledgeSearchMatch, WorkflowSummary } from '../../api/types';
import { fileToContextUpload, MAX_CONTEXT_FILE_BYTES } from '../../lib/files';
import { toastApiError, toastInfo, toastSuccess, toastWarning } from '../../lib/toast';
import { Button, Input, Modal, ModalHeader, ModalBody, ModalFooter } from '../ui';
import { SegmentedControl } from '../ui/SegmentedControl';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

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
  const [workflowSearch, setWorkflowSearch] = useState('');

  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [documentContent, setDocumentContent] = useState('');
  const [documentLoading, setDocumentLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<KnowledgeSearchMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteDocConfirmId, setDeleteDocConfirmId] = useState<string | null>(null);

  const sessionId = typeof workspace?.active_session_id === 'string' ? (workspace.active_session_id as string) : null;

  const filteredFiles = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return files;
    return files.filter((p) => p.toLowerCase().includes(q));
  }, [files, filter]);

  const filteredWorkflows = useMemo(() => {
    const q = workflowSearch.trim().toLowerCase();
    const matched = q ? workflows.filter((w) => w.objective.toLowerCase().includes(q) || w.id.includes(q)) : workflows;
    return matched.slice(0, workflowSearch ? 100 : 20);
  }, [workflows, workflowSearch]);

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

  const [fileTab, setFileTab] = useState<'all' | 'workflows' | 'knowledge'>('all');
  const FILE_TABS = [
    { id: 'all' as const, label: 'All' },
    { id: 'workflows' as const, label: 'Task files' },
    { id: 'knowledge' as const, label: 'Knowledge library' },
  ];

  return (
    <>
    <div className="flex h-full flex-1 overflow-hidden bg-surface-warm">
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-primary">Files</h1>
            <p className="mt-1 text-sm text-secondary">Browse task outputs and manage your knowledge library.</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-primary hover:bg-surface-hover transition-colors">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
              Upload
              <input type="file" multiple className="hidden" onChange={(event) => void handleUploadDocuments(event.target.files)} />
            </label>
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-5 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <Input
              value={fileTab === 'knowledge' ? searchQuery : filter}
              onChange={(e) => fileTab === 'knowledge' ? setSearchQuery(e.target.value) : setFilter(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && fileTab === 'knowledge') void handleSearch(); }}
              placeholder={fileTab === 'knowledge' ? 'Search knowledge base...' : 'Filter files...'}
              className="pl-9"
            />
          </div>
          {fileTab === 'knowledge' && (
            <Button variant="secondary" size="sm" onClick={() => void handleSearch()} disabled={searching}>
              {searching ? <Loader2 size={14} className="animate-spin" /> : 'Search'}
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <SegmentedControl
            value={fileTab}
            options={FILE_TABS.map((t) => ({ label: t.label, value: t.id }))}
            onChange={(val) => setFileTab(val)}
          />
        </div>

        {/* Content */}
        {(fileTab === 'all' || fileTab === 'workflows') && (
          <div className="mb-8">
            {fileTab === 'all' && <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Task files</h2>}

            {/* Workflow selector */}
            <div className="mb-4">
              <div className="flex items-center gap-3">
                <select
                  value={selectedWorkflowId ?? ''}
                  onChange={(e) => {
                    setSelectedWorkflowId(e.target.value || null);
                    const wf = workflows.find((w) => w.id === e.target.value);
                    if (wf) onSelectWorkflow?.(wf.id, wf.objective);
                  }}
                  className="rounded-xl border border-border-light bg-surface px-3 py-2 text-sm text-primary outline-none max-w-sm"
                >
                  {filteredWorkflows.map((wf) => (
                    <option key={wf.id} value={wf.id}>
                      {wf.objective || 'Untitled'}
                    </option>
                  ))}
                </select>
                {loading && <Loader2 size={14} className="animate-spin text-muted" />}
                <span className="text-xs text-muted">{sessionId ? 'Session active' : 'Session inactive'}</span>
              </div>
            </div>

            {/* File cards */}
            {filteredFiles.length === 0 ? (
              <div className="rounded-xl border border-border-light bg-surface p-8 text-center text-sm text-muted">
                {files.length === 0 ? 'No files created yet.' : 'No files match your filter.'}
              </div>
            ) : (
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredFiles.map((path) => {
                  const fileName = path.split('/').pop() ?? path;
                  const ext = fileName.includes('.') ? fileName.split('.').pop()?.toUpperCase() ?? '' : '';
                  const isImage = ['PNG', 'JPG', 'JPEG', 'GIF', 'SVG', 'WEBP'].includes(ext);
                  const isActive = preview.kind !== 'empty' && 'path' in preview && preview.path === path;
                  return (
                    <button
                      key={path}
                      type="button"
                      onClick={() => void openFile(path)}
                      className={[
                        'group rounded-xl border bg-surface p-4 text-left transition-all duration-150 hover:shadow-sm',
                        isActive ? 'border-primary shadow-sm' : 'border-border-light hover:border-border',
                      ].join(' ')}
                    >
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-secondary">
                        {isImage ? <ImageIcon size={18} className="text-muted" /> : <FileSearch size={18} className="text-muted" />}
                      </div>
                      <div className="truncate text-sm font-medium text-primary">{fileName}</div>
                      {ext && <div className="mt-0.5 text-xs text-muted">{ext} file</div>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Preview panel (inline) */}
            {preview.kind !== 'empty' && (
              <div className="mt-6 rounded-xl border border-border-light bg-surface">
                <div className="flex items-center justify-between border-b border-border-light px-5 py-3">
                  <span className="text-sm font-medium text-primary">
                    {'path' in preview ? preview.path : 'Preview'}
                  </span>
                  <button type="button" onClick={() => setPreview({ kind: 'empty' })} className="text-xs text-muted hover:text-primary">Close</button>
                </div>
                <div className="max-h-[400px] overflow-y-auto p-5">
                  {preview.kind === 'loading' && (
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <Loader2 size={16} className="animate-spin" />
                      Loading preview…
                    </div>
                  )}
                  {preview.kind === 'error' && <div className="text-sm text-danger">{preview.message}</div>}
                  {preview.kind === 'image' && <img src={preview.url} alt={preview.path} className="max-w-full rounded-lg border border-border-light" />}
                  {preview.kind === 'text' && <Highlighter language="text" variant="borderless" copyable showLanguage={false} wrap>{preview.text}</Highlighter>}
                </div>
              </div>
            )}
          </div>
        )}

        {(fileTab === 'all' || fileTab === 'knowledge') && (
          <div>
            {fileTab === 'all' && <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Knowledge library</h2>}

            {/* Search matches */}
            {searchMatches.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">Search results</h3>
                <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
                  {searchMatches.map((match) => (
                    <button
                      key={match.chunk_id}
                      type="button"
                      onClick={() => {
                        setSelectedDocumentId(match.document_id);
                        setSearchMatches([]);
                      }}
                      className="rounded-xl border border-border-light bg-surface p-4 text-left hover:border-border hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        {match.extraction_mode === 'ocr' ? <ScanSearch size={14} /> : match.extraction_mode === 'document' ? <ImageIcon size={14} /> : <FileSearch size={14} />}
                        {match.filename}
                      </div>
                      <div className="mt-1 text-xs text-muted">Similarity {(match.score * 100).toFixed(1)}%</div>
                      <div className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-secondary">{match.content}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Document cards */}
            {documents.length === 0 ? (
              <div className="rounded-xl border border-border-light bg-surface p-8 text-center text-sm text-muted">
                No documents ingested yet. Upload text, PDF, or image files to build your knowledge library.
              </div>
            ) : (
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {documents.map((document) => {
                  const ext = document.filename.includes('.') ? document.filename.split('.').pop()?.toUpperCase() ?? '' : '';
                  const isActive = selectedDocumentId === document.id;
                  return (
                    <div
                      key={document.id}
                      className={[
                        'group relative rounded-xl border bg-surface p-4 transition-all duration-150 cursor-pointer hover:shadow-sm',
                        isActive ? 'border-primary shadow-sm' : 'border-border-light hover:border-border',
                      ].join(' ')}
                      onClick={() => setSelectedDocumentId(document.id)}
                    >
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-secondary">
                        {document.extraction_mode === 'ocr' ? <ScanSearch size={18} className="text-muted" /> : <FileSearch size={18} className="text-muted" />}
                      </div>
                      <div className="truncate text-sm font-medium text-primary">{document.filename}</div>
                      <div className="mt-0.5 text-xs text-muted">
                        {ext && `${ext} • `}{formatBytes(document.byte_size)}
                      </div>
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); setDeleteDocConfirmId(document.id); }}
                        className="absolute top-3 right-3 rounded-lg p-1.5 text-muted opacity-0 group-hover:opacity-100 hover:bg-surface-hover hover:text-danger transition-all"
                        aria-label="Delete document"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Document viewer (inline) */}
            {selectedDocument && (
              <div className="mt-6 rounded-xl border border-border-light bg-surface">
                <div className="flex items-center justify-between border-b border-border-light px-5 py-3">
                  <div>
                    <div className="text-sm font-medium text-primary">{selectedDocument.filename}</div>
                    <div className="text-xs text-muted capitalize">{selectedDocument.extraction_mode === 'ocr' ? 'Scanned (OCR)' : selectedDocument.extraction_mode === 'document' ? 'Text extracted' : selectedDocument.extraction_mode} • {selectedDocument.status}</div>
                  </div>
                  <button type="button" onClick={() => setSelectedDocumentId(null)} className="text-xs text-muted hover:text-primary">Close</button>
                </div>
                <div className="max-h-[400px] overflow-y-auto p-5">
                  {documentLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <Loader2 size={16} className="animate-spin" />
                      Loading document…
                    </div>
                  ) : (
                    <Highlighter language="text" variant="borderless" copyable showLanguage={false} wrap>{documentContent}</Highlighter>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {deleteDocConfirmId && (
      <Modal onClose={() => setDeleteDocConfirmId(null)} maxWidth="max-w-sm">
        <ModalHeader title="Remove document?" onClose={() => setDeleteDocConfirmId(null)} />
        <ModalBody>
          <p className="text-sm text-secondary">This will permanently remove the document from your knowledge library. This cannot be undone.</p>
        </ModalBody>
        <ModalFooter className="justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteDocConfirmId(null)}>Cancel</Button>
          <Button variant="danger" onClick={async () => {
            const id = deleteDocConfirmId;
            setDeleteDocConfirmId(null);
            try { await deleteKnowledgeDocument(config, id); toastSuccess('Document removed'); await refreshKnowledgeDocuments(); }
            catch (err) { toastApiError(err, 'Failed to delete document'); }
          }}>Remove</Button>
        </ModalFooter>
      </Modal>
    )}
    </>
  );
}
