import { Plus, Search } from 'lucide-react';
import { Alert } from '@lobehub/ui';
import type { ApiConfig } from '../../api/client';
import { Button } from '../ui';
import { RelayEmpty } from '../shared/RelayEmpty';
import { SkillGrid } from './SkillGrid';
import { SkillDetailPanel } from './SkillDetailPanel';
import { SkillEditorModal } from './SkillEditorModal';
import { DeleteSkillModal } from './DeleteSkillModal';
import { useSkillsPageState } from './useSkillsPageState';

interface SkillsPageProps {
  config: ApiConfig;
}

export function SkillsPage({ config }: SkillsPageProps) {
  const state = useSkillsPageState(config);

  return (
    <div className="flex flex-col h-full flex-1 overflow-hidden bg-surface-warm font-sans">
      {!state.canUseApi ? (
        <div className="flex flex-1 items-center justify-center">
          <RelayEmpty title="Sign in required" description="Sign in to manage skills." />
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex flex-wrap items-center justify-between gap-3 flex-shrink-0 px-4 md:px-8 pt-6 md:pt-8 pb-2">
            <h1 className="text-xl font-semibold text-primary">Skills</h1>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  type="text"
                  value={state.searchQuery}
                  onChange={(e) => state.setSearchQuery(e.target.value)}
                  placeholder="Search skills"
                  aria-label="Search skills"
                  className="pl-9 pr-3 py-2 rounded-lg border border-border-light bg-surface text-sm text-primary placeholder:text-placeholder outline-none w-[140px] md:w-[200px]"
                />
              </div>
              <Button onClick={state.openCreateEditor}>
                <Plus size={14} />
                Create skill
              </Button>
            </div>
          </div>

          <div className="px-4 md:px-8 pb-4">
            <p className="text-sm text-secondary leading-relaxed">
              Custom instructions and tools that extend what your AI can do.
              Skills are applied automatically when relevant.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8">
            {state.unsupportedApi && (
              <Alert className="mb-4" type="warning" title="Skills aren't available on this server yet. Contact your administrator to enable them." variant="outlined" />
            )}
            <SkillGrid
              skills={state.filteredSkills}
              selectedId={state.selectedId}
              loading={state.loading}
              onSelectSkill={state.setSelectedId}
              onEditSkill={state.handleEditSkillFromGrid}
              onDeleteSkill={state.setDeleteConfirmId}
              onCreateSkill={state.openCreateEditor}
            />
          </div>

          {state.selectedSkill && (
            <SkillDetailPanel
              skill={state.selectedSkill}
              onClose={() => state.setSelectedId(null)}
              onEdit={state.openEditEditor}
            />
          )}
        </div>
      )}

      {state.editorOpen && (
        <SkillEditorModal
          mode={state.editorMode}
          draftName={state.draftName}
          draftId={state.draftId}
          draftDescription={state.draftDescription}
          draftInstructions={state.draftInstructions}
          draftTools={state.draftTools}
          importMarkdown={state.importMarkdown}
          saving={state.saving}
          onDraftNameChange={state.setDraftName}
          onDraftIdChange={state.setDraftId}
          onDraftDescriptionChange={state.setDraftDescription}
          onDraftInstructionsChange={state.setDraftInstructions}
          onDraftToolsChange={state.setDraftTools}
          onImportMarkdownChange={state.setImportMarkdown}
          onSave={() => void (state.editorMode === 'import' ? state.importSkillMarkdown() : state.saveSkill())}
          onClose={() => state.setEditorOpen(false)}
        />
      )}

      {state.deleteConfirmId && (
        <DeleteSkillModal
          skillId={state.deleteConfirmId}
          deleting={state.deleting}
          onConfirm={() => void state.deleteSkillById(state.deleteConfirmId!)}
          onClose={() => state.setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
}
