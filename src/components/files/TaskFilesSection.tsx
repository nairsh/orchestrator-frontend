import { FileSearch, ImageIcon, Loader2 } from 'lucide-react';
import { Highlighter } from '@lobehub/ui';
import type { WorkflowSummary } from '../../api/types';
import type { PreviewState } from './helpers';
import { getFileName, getFileExtension, isImageExtension } from '../../lib/fileUtils';

interface TaskFilesSectionProps {
  fileTab: 'all' | 'workflows' | 'knowledge';
  selectedWorkflowId: string | null;
  filteredWorkflows: WorkflowSummary[];
  workflows: WorkflowSummary[];
  loading: boolean;
  sessionId: string | null;
  filteredFiles: string[];
  files: string[];
  preview: PreviewState;
  onSelectWorkflow: (id: string | null) => void;
  onSelectWorkflowNav?: (id: string, objective: string) => void;
  onOpenFile: (path: string) => void;
  onClosePreview: () => void;
}

export function TaskFilesSection({
  fileTab,
  selectedWorkflowId,
  filteredWorkflows,
  workflows,
  loading,
  sessionId,
  filteredFiles,
  files,
  preview,
  onSelectWorkflow,
  onSelectWorkflowNav,
  onOpenFile,
  onClosePreview,
}: TaskFilesSectionProps) {
  return (
    <div className="mb-8">
      {fileTab === 'all' && <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Task files</h2>}

      {/* Workflow selector */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <select
            value={selectedWorkflowId ?? ''}
            aria-label="Select workflow"
            onChange={(e) => {
              onSelectWorkflow(e.target.value || null);
              const wf = workflows.find((w) => w.id === e.target.value);
              if (wf) onSelectWorkflowNav?.(wf.id, wf.objective);
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
          <span className="text-xs text-muted">{sessionId ? 'Workspace ready' : 'No active workspace'}</span>
        </div>
      </div>

      {/* File cards */}
      {filteredFiles.length === 0 ? (
        <div className="rounded-xl border border-border-light bg-surface p-8 text-center text-sm text-muted">
          {files.length === 0
            ? selectedWorkflowId
              ? 'This task hasn\'t created any files yet. Run the task to see outputs here.'
              : 'Select a task above to view its files.'
            : 'No files match your filter.'}
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredFiles.map((path) => {
            const fileName = getFileName(path, path);
            const ext = getFileExtension(fileName);
            const isImage = isImageExtension(ext);
            const isActive = preview.kind !== 'empty' && 'path' in preview && preview.path === path;
            return (
              <button
                key={path}
                type="button"
                onClick={() => onOpenFile(path)}
                aria-label={`Open file: ${fileName}`}
                className={[
                  'group rounded-xl border bg-surface p-4 text-left transition-all duration-200 hover:shadow-sm',
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
            <button type="button" onClick={onClosePreview} className="text-xs text-muted hover:text-primary transition-colors duration-200">Close</button>
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
  );
}
