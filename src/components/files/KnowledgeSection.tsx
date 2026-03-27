import { useState } from 'react';
import { FileSearch, ImageIcon, Loader2, ScanSearch, Trash2, UploadCloud } from 'lucide-react';
import { Highlighter } from '@lobehub/ui';
import type { KnowledgeDocument, KnowledgeSearchMatch } from '../../api/types';
import { formatBytes } from './helpers';
import { getFileExtension } from '../../lib/fileUtils';

interface KnowledgeSectionProps {
  fileTab: 'all' | 'workflows' | 'knowledge';
  searchMatches: KnowledgeSearchMatch[];
  documents: KnowledgeDocument[];
  selectedDocumentId: string | null;
  selectedDocument: KnowledgeDocument | null;
  documentContent: string;
  documentLoading: boolean;
  uploading?: boolean;
  onUpload?: (files: FileList | null) => void;
  onSelectDocument: (id: string | null) => void;
  onDeleteDocument: (id: string) => void;
  onClearSearchMatches: () => void;
}

export function KnowledgeSection({
  fileTab,
  searchMatches,
  documents,
  selectedDocumentId,
  selectedDocument,
  documentContent,
  documentLoading,
  uploading,
  onUpload,
  onSelectDocument,
  onDeleteDocument,
  onClearSearchMatches,
}: KnowledgeSectionProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  return (
    <div>
      {fileTab === 'all' && (
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Knowledge library</h2>
          {onUpload && (
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border-light bg-surface px-2.5 py-1 text-xs font-medium text-primary hover:bg-surface-hover transition-colors duration-200">
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />}
              Upload
              <input type="file" multiple className="hidden" onChange={(event) => onUpload(event.target.files)} />
            </label>
          )}
        </div>
      )}
      {fileTab === 'knowledge' && onUpload && (
        <div className="mb-4 flex justify-end">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border-light bg-surface px-2.5 py-1 text-xs font-medium text-primary hover:bg-surface-hover transition-colors duration-200">
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />}
            Upload
            <input type="file" multiple className="hidden" onChange={(event) => onUpload(event.target.files)} />
          </label>
        </div>
      )}

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
                  onSelectDocument(match.document_id);
                  onClearSearchMatches();
                }}
                className="rounded-xl border border-border-light bg-surface p-4 text-left hover:border-border hover:shadow-sm transition-all duration-200"
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
          No documents added yet. Upload text, PDF, or image files to build your knowledge library.
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {documents.map((document) => {
            const ext = getFileExtension(document.filename);
            const isActive = selectedDocumentId === document.id;
            return (
              <div
                key={document.id}
                className={[
                  'group relative rounded-xl border bg-surface p-4 transition-all duration-200 cursor-pointer hover:shadow-sm hover:-translate-y-px active:translate-y-0',
                  isActive ? 'border-primary shadow-sm' : 'border-border-light hover:border-border',
                ].join(' ')}
                onClick={() => onSelectDocument(document.id)}
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-secondary">
                  {document.extraction_mode === 'ocr' ? <ScanSearch size={18} className="text-muted" /> : <FileSearch size={18} className="text-muted" />}
                </div>
                <div className="truncate text-sm font-medium text-primary">{document.filename}</div>
                <div className="mt-0.5 text-xs text-muted">
                  {ext && `${ext} • `}{formatBytes(document.byte_size)}
                </div>
                {deleteConfirmId === document.id ? (
                  <div
                    className="absolute top-2 right-2 flex items-center gap-1.5 rounded-lg bg-danger/10 px-2 py-1 border border-danger/20"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <span className="text-xs text-danger font-medium">Delete?</span>
                    <button
                      type="button"
                      onClick={() => { setDeleteConfirmId(null); onDeleteDocument(document.id); }}
                      className="rounded px-1.5 py-0.5 text-[11px] font-medium text-white bg-danger hover:bg-danger/90 transition-colors duration-200"
                    >Yes</button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(null)}
                      className="text-xs text-muted hover:text-primary transition-colors duration-200"
                      aria-label="Cancel"
                    >✕</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); setDeleteConfirmId(document.id); }}
                    className="absolute top-3 right-3 rounded-lg p-1.5 text-muted opacity-0 group-hover:opacity-100 hover:bg-surface-hover hover:text-danger transition-all duration-200"
                    aria-label="Delete document"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
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
            <button type="button" onClick={() => onSelectDocument(null)} className="text-xs text-muted hover:text-primary transition-colors duration-200">Close</button>
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
  );
}
