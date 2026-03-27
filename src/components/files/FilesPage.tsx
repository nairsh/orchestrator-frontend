import { Loader2, Search } from 'lucide-react';
import { Button, Input } from '../ui';
import { SegmentedControl } from '../ui/SegmentedControl';
import { FILE_TABS } from './helpers';
import { TaskFilesSection } from './TaskFilesSection';
import { KnowledgeSection } from './KnowledgeSection';
import { DeleteDocumentModal } from './DeleteDocumentModal';
import { useFilesPageState } from './useFilesPageState';

export type { FilesPageProps } from './helpers';

export function FilesPage({ config, workflows, initialWorkflowId, onSelectWorkflow }: import('./helpers').FilesPageProps) {
  const state = useFilesPageState(config, workflows, initialWorkflowId);

  return (
    <>
    <div className="flex h-full flex-1 overflow-hidden bg-surface-warm">
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-primary">Files</h1>
          <p className="mt-1 text-sm text-secondary">Browse task outputs and manage your knowledge library.</p>
        </div>

        {/* Search bar */}
        <div className="mb-5 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <Input
              value={state.fileTab === 'knowledge' ? state.searchQuery : state.filter}
              onChange={(e) => state.fileTab === 'knowledge' ? state.setSearchQuery(e.target.value) : state.setFilter(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && state.fileTab === 'knowledge') void state.handleSearch(); }}
              placeholder={state.fileTab === 'knowledge' ? 'Search knowledge base…' : 'Filter files…'}
              aria-label={state.fileTab === 'knowledge' ? 'Search knowledge base' : 'Filter files'}
              className="pl-9"
            />
          </div>
          {state.fileTab === 'knowledge' && (
            <Button variant="secondary" size="sm" onClick={() => void state.handleSearch()} disabled={state.searching}>
              {state.searching ? <Loader2 size={14} className="animate-spin" /> : 'Search'}
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <SegmentedControl
            value={state.fileTab}
            options={FILE_TABS.map((t) => ({ label: t.label, value: t.id }))}
            onChange={(val) => state.setFileTab(val)}
          />
        </div>

        {/* Content */}
        {(state.fileTab === 'all' || state.fileTab === 'workflows') && (
          <TaskFilesSection
            fileTab={state.fileTab}
            selectedWorkflowId={state.selectedWorkflowId}
            filteredWorkflows={state.filteredWorkflows}
            workflows={workflows}
            loading={state.loading}
            sessionId={state.sessionId}
            filteredFiles={state.filteredFiles}
            files={state.files}
            preview={state.preview}
            onSelectWorkflow={state.setSelectedWorkflowId}
            onSelectWorkflowNav={onSelectWorkflow}
            onOpenFile={(path) => void state.openFile(path)}
            onClosePreview={() => state.setPreview({ kind: 'empty' })}
          />
        )}

        {(state.fileTab === 'all' || state.fileTab === 'knowledge') && (
          <KnowledgeSection
            fileTab={state.fileTab}
            searchMatches={state.searchMatches}
            documents={state.documents}
            selectedDocumentId={state.selectedDocumentId}
            selectedDocument={state.selectedDocument}
            documentContent={state.documentContent}
            documentLoading={state.documentLoading}
            uploading={state.uploading}
            loading={state.loading}
            onUpload={(files) => void state.handleUploadDocuments(files)}
            onSelectDocument={state.setSelectedDocumentId}
            onDeleteDocument={(id) => state.setDeleteDocConfirmId(id)}
            onClearSearchMatches={() => state.setSearchMatches([])}
          />
        )}
      </div>
    </div>

    {state.deleteDocConfirmId && (
      <DeleteDocumentModal
        deletingDoc={state.deletingDoc}
        onConfirm={() => void state.handleDeleteDocument()}
        onCancel={() => state.setDeleteDocConfirmId(null)}
      />
    )}
    </>
  );
}
