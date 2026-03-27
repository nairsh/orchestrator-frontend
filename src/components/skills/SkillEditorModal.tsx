import { AlertCircle, FileUp } from 'lucide-react';
import { Button, Input, Modal, ModalBody, ModalFooter, ModalHeader, Textarea } from '../ui';
import { formatSkillName, nameToSlug } from './helpers';

export type EditorMode = 'create' | 'edit' | 'import';

interface SkillEditorModalProps {
  mode: EditorMode;
  draftName: string;
  draftId: string;
  draftDescription: string;
  draftInstructions: string;
  draftTools: string;
  importMarkdown: string;
  saving: boolean;
  onDraftNameChange: (value: string) => void;
  onDraftIdChange: (value: string) => void;
  onDraftDescriptionChange: (value: string) => void;
  onDraftInstructionsChange: (value: string) => void;
  onDraftToolsChange: (value: string) => void;
  onImportMarkdownChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function SkillEditorModal({
  mode, draftName, draftId, draftDescription, draftInstructions, draftTools,
  importMarkdown, saving, onDraftNameChange, onDraftIdChange, onDraftDescriptionChange,
  onDraftInstructionsChange, onDraftToolsChange, onImportMarkdownChange, onSave, onClose,
}: SkillEditorModalProps) {
  return (
    <Modal onClose={onClose} maxWidth="max-w-3xl" className="border border-border-light bg-surface">
      <ModalHeader
        title={mode === 'import' ? 'Import skill markdown' : mode === 'edit' ? 'Edit skill' : 'Create skill'}
        onClose={onClose}
      />
      <ModalBody className="flex flex-col gap-4">
        {mode === 'create' ? (
          <div>
            <Input
              label="Name"
              value={draftName}
              onChange={(event) => onDraftNameChange(event.target.value)}
              placeholder="Weekly Status Report"
              autoFocus
            />
            {draftName.trim() && (
              <div className="mt-1.5 text-xs text-muted">
                Saved as: <span className="font-mono">{nameToSlug(draftName)}</span>
              </div>
            )}
          </div>
        ) : mode === 'edit' ? (
          <Input label="Name" value={formatSkillName(draftId)} disabled />
        ) : (
          <Input label="Skill ID" value={draftId} onChange={(event) => onDraftIdChange(event.target.value)} placeholder="weekly-status-report" />
        )}

        {mode === 'import' ? (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-primary">Markdown</label>
            <Textarea
              value={importMarkdown}
              onChange={(event) => onImportMarkdownChange(event.target.value)}
              maxHeight={360}
              placeholder="Paste full SKILL.md contents here"
              className="rounded-lg border border-border-light bg-surface px-3 py-2"
            />
            <div className="mt-2 flex items-start gap-2 rounded-2xl border border-border-light bg-surface-secondary px-3 py-3 text-xs text-muted">
              <FileUp size={14} className="mt-0.5 flex-shrink-0" />
              Include a header section with at least a description.
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-primary">Description</label>
              <Textarea
                value={draftDescription}
                onChange={(event) => onDraftDescriptionChange(event.target.value)}
                maxHeight={120}
                placeholder="Generate weekly status reports from recent work..."
                className="rounded-lg border border-border-light bg-surface px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-primary">Instructions</label>
              <Textarea
                value={draftInstructions}
                onChange={(event) => onDraftInstructionsChange(event.target.value)}
                maxHeight={300}
                placeholder="Summarize recent work in three sections: wins, blockers, and next steps..."
                className="rounded-lg border border-border-light bg-surface px-3 py-2"
              />
            </div>

            <Input label="Tools" value={draftTools} onChange={(event) => onDraftToolsChange(event.target.value)} placeholder="web_search, file_read, bash (comma-separated)" />
            <div className="text-xs text-muted -mt-1">Optional — limit which capabilities this skill can use.</div>
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <div className="flex items-center gap-2 text-xs text-muted">
          <AlertCircle size={13} />
          Saved to your account and applied alongside built-in capabilities.
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : mode === 'import' ? 'Import' : mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
