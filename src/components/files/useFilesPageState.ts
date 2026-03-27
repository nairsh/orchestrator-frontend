import { useEffect, useMemo, useState } from 'react';
import type { ApiConfig } from '../../api/client';
import { deleteKnowledgeDocument, getKnowledgeDocument, getWorkspace, listKnowledgeDocuments, searchKnowledge, uploadKnowledgeDocument } from '../../api/client';
import type { KnowledgeDocument, KnowledgeSearchMatch, WorkflowSummary } from '../../api/types';
import { fileToContextUpload, MAX_CONTEXT_FILE_BYTES } from '../../lib/files';
import { toastApiError, toastInfo, toastSuccess, toastWarning } from '../../lib/toast';
import type { FileTab, PreviewState } from './helpers';
import { resolveAuthToken } from './helpers';

export function useFilesPageState(
  config: ApiConfig,
  workflows: WorkflowSummary[],
  initialWorkflowId?: string | null,
) {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(initialWorkflowId ?? workflows[0]?.id ?? null);
  const [workspace, setWorkspace] = useState<Record<string, unknown> | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewState>({ kind: 'empty' });
  const [filter, setFilter] = useState('');

  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [, setDocumentsLoading] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [documentContent, setDocumentContent] = useState('');
  const [documentLoading, setDocumentLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<KnowledgeSearchMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteDocConfirmId, setDeleteDocConfirmId] = useState<string | null>(null);
  const [deletingDoc, setDeletingDoc] = useState(false);
  const [fileTab, setFileTab] = useState<FileTab>('all');

  const sessionId = typeof workspace?.active_session_id === 'string' ? (workspace.active_session_id as string) : null;

  const filteredFiles = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return files;
    return files.filter((p) => p.toLowerCase().includes(q));
  }, [files, filter]);

  const filteredWorkflows = useMemo(() => {
    return workflows.slice(0, 20);
  }, [workflows]);

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
      toastApiError(err, 'Couldn\'t load your knowledge library');
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
        toastApiError(err, 'Couldn\'t load workspace files');
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
        toastApiError(err, 'Couldn\'t load this document');
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
      toastInfo('No active session', 'Start a task to create a file workspace.');
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
      toastApiError(err, 'Couldn\'t open this file');
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
      toastApiError(err, 'Couldn\'t upload document');
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
      toastApiError(err, 'Couldn\'t search your library');
    } finally {
      setSearching(false);
    }
  };

  const handleDeleteDocument = async () => {
    const id = deleteDocConfirmId;
    if (!id) return;
    setDeletingDoc(true);
    try {
      await deleteKnowledgeDocument(config, id);
      toastSuccess('Document removed');
      setDeleteDocConfirmId(null);
      await refreshKnowledgeDocuments();
    } catch (err) {
      toastApiError(err, 'Couldn\'t delete document');
    } finally {
      setDeletingDoc(false);
    }
  };

  return {
    fileTab, setFileTab,
    selectedWorkflowId, setSelectedWorkflowId,
    loading, sessionId,
    files, filteredFiles, filter, setFilter,
    filteredWorkflows,
    preview, setPreview,
    documents, selectedDocumentId, setSelectedDocumentId, selectedDocument,
    documentContent, documentLoading,
    searchQuery, setSearchQuery, searchMatches, setSearchMatches, searching,
    uploading, deletingDoc,
    deleteDocConfirmId, setDeleteDocConfirmId,
    openFile, handleUploadDocuments, handleSearch, handleDeleteDocument,
  };
}
