import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Code2, Eye, FileUp, FileText, Loader2, MoreHorizontal, Plus, Search, Sparkles, Upload } from 'lucide-react';
import type { ApiConfig } from '../../api/client';
import { ApiError, importSkill, listSkills, removeSkill, upsertSkill } from '../../api/client';
import type { SkillRecord } from '../../api/types';
import { Markdown } from '../markdown/Markdown';
import { toastApiError, toastInfo, toastSuccess, toastWarning } from '../../lib/toast';
import { Button, DropdownMenu, DropdownMenuItem, IconButton, Input, Modal, ModalBody, ModalFooter, ModalHeader, Textarea } from '../ui';

const SKILL_ID_REGEX = /^[a-z0-9-]{1,64}$/;

interface SkillsPageProps {
  config: ApiConfig;
}

type EditorMode = 'create' | 'edit' | 'import';

export function SkillsPage({ config }: SkillsPageProps) {
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [unsupportedApi, setUnsupportedApi] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewMode, setPreviewMode] = useState<'preview' | 'raw'>('preview');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('create');
  const [draftId, setDraftId] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftInstructions, setDraftInstructions] = useState('');
  const [draftTools, setDraftTools] = useState('');
  const [importMarkdown, setImportMarkdown] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canUseApi = useMemo(() => Boolean(config.hasAuth), [config.hasAuth]);
  const selectedSkill = useMemo(() => (selectedId ? skills.find((skill) => skill.id === selectedId) ?? null : null), [skills, selectedId]);

  const filteredSkills = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return skills;
    return skills.filter(
      (skill) =>
        skill.id.toLowerCase().includes(query) ||
        skill.description.toLowerCase().includes(query) ||
        skill.prompt_addendum.toLowerCase().includes(query)
    );
  }, [skills, searchQuery]);

  const detailDocument = selectedSkill
    ? `---\nname: ${selectedSkill.id}\ndescription: ${selectedSkill.description}\n${selectedSkill.tools.length > 0 ? `tools:\n${selectedSkill.tools.map((tool) => `  - ${tool}`).join('\n')}\n` : ''}---\n\n${selectedSkill.prompt_addendum}`
    : '';

  const loadSkills = async (preferredSkillId?: string | null) => {
    if (!canUseApi) return;

    setLoading(true);
    try {
      const response = await listSkills(config);
      const nextSkills = response.skills ?? [];
      setUnsupportedApi(false);
      setSkills(nextSkills);
      const targetId = preferredSkillId ?? selectedId;
      if (targetId && nextSkills.some((skill) => skill.id === targetId)) {
        setSelectedId(targetId);
      } else {
        setSelectedId(nextSkills[0]?.id ?? null);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setUnsupportedApi(true);
        setSkills([]);
        setSelectedId(null);
        return;
      }
      toastApiError(error, 'Failed to load skills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSkills();
  }, [canUseApi, config.baseUrl, config.hasAuth]);

  const openCreateEditor = () => {
    setEditorMode('create');
    setDraftId('');
    setDraftDescription('');
    setDraftInstructions('');
    setDraftTools('');
    setImportMarkdown('');
    setEditorOpen(true);
  };

  const openEditEditor = () => {
    if (!selectedSkill) return;
    setEditorMode('edit');
    setDraftId(selectedSkill.id);
    setDraftDescription(selectedSkill.description);
    setDraftInstructions(selectedSkill.prompt_addendum);
    setDraftTools(selectedSkill.tools.join(', '));
    setImportMarkdown('');
    setEditorOpen(true);
  };

  const openImportEditor = () => {
    setEditorMode('import');
    setDraftId('');
    setDraftDescription('');
    setDraftInstructions('');
    setDraftTools('');
    setImportMarkdown(`---\nname: weekly-digest\ndescription: Build a weekly digest from recent activity\ntools:\n  - web_search\n  - file_read\n---\n\nWrite a concise update with wins, blockers, and next steps.`);
    setEditorOpen(true);
  };

  const parseTools = (): string[] =>
    draftTools
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

  const validateId = (value: string): boolean => {
    if (!value) {
      toastWarning('Missing skill id', 'Skill id is required.');
      return false;
    }
    if (!SKILL_ID_REGEX.test(value)) {
      toastWarning('Invalid skill id', 'Use lowercase letters, numbers, and dashes only (max 64 characters).');
      return false;
    }
    return true;
  };

  const saveSkill = async () => {
    const id = draftId.trim();
    const description = draftDescription.trim();

    if (!validateId(id)) return;
    if (!description) {
      toastWarning('Missing description', 'Skill description is required.');
      return;
    }

    setSaving(true);
    try {
      const response = await upsertSkill(config, id, {
        name: id,
        description,
        prompt_addendum: draftInstructions,
        tools: parseTools(),
      });
      toastSuccess(editorMode === 'create' ? 'Skill created' : 'Skill updated', response.skill.id);
      setEditorOpen(false);
      await loadSkills(response.skill.id);
    } catch (error) {
      toastApiError(error, 'Failed to save skill');
    } finally {
      setSaving(false);
    }
  };

  const importSkillMarkdown = async () => {
    const id = draftId.trim();
    if (!validateId(id)) return;
    if (!importMarkdown.trim()) {
      toastWarning('Missing markdown', 'Paste the skill markdown to import it.');
      return;
    }

    setSaving(true);
    try {
      const response = await importSkill(config, { skill_id: id, markdown: importMarkdown });
      toastSuccess('Skill imported', response.skill.id);
      setEditorOpen(false);
      await loadSkills(response.skill.id);
    } catch (error) {
      toastApiError(error, 'Failed to import skill');
    } finally {
      setSaving(false);
    }
  };

  const deleteSelectedSkill = async () => {
    if (!selectedSkill) return;
    const ok = window.confirm(`Delete skill '${selectedSkill.id}'?`);
    if (!ok) return;

    setDeleting(true);
    try {
      await removeSkill(config, selectedSkill.id);
      toastSuccess('Skill deleted', selectedSkill.id);
      await loadSkills();
    } catch (error) {
      toastApiError(error, 'Failed to delete skill');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex h-full flex-1 overflow-hidden app-ui bg-surface-warm">
      {!canUseApi ? (
        <div className="flex flex-1 items-center justify-center text-sm text-placeholder">Sign in to manage skills.</div>
      ) : (
        <>
          <div className="flex h-full w-[360px] flex-col border-r border-border-light bg-surface-secondary">
            <div className="border-b border-border-light px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted">
                    <Sparkles size={12} />
                    Prompt assets
                  </div>
                  <div className="mt-2 text-xl font-semibold text-primary">Skills</div>
                </div>

                <DropdownMenu
                  trigger={({ toggle }) => (
                    <IconButton onClick={toggle} label="Skill actions" className="border border-border bg-surface">
                      <Plus size={16} />
                    </IconButton>
                  )}
                  width={220}
                >
                  <DropdownMenuItem onClick={openCreateEditor}>
                    <FileText size={14} />
                    Write skill
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openImportEditor}>
                    <Upload size={14} />
                    Import markdown
                  </DropdownMenuItem>
                </DropdownMenu>
              </div>

              <div className="mt-4">
                <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search skills" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {unsupportedApi && (
                <div className="mb-3 rounded-2xl border border-warning/40 bg-warning/15 px-3 py-3 text-xs text-warning">
                  Skills endpoint is missing (`/v1/skills` returned 404). Update the API server.
                </div>
              )}

              {filteredSkills.length === 0 ? (
                <div className="rounded-2xl border border-border-light bg-surface px-4 py-4 text-sm text-muted">
                  {loading ? 'Loading skills...' : 'No skills found yet.'}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredSkills.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => setSelectedId(skill.id)}
                      className={[
                        'rounded-2xl border px-4 py-3 text-left transition-colors duration-150',
                        selectedId === skill.id ? 'border-border bg-surface text-primary shadow-sm' : 'border-border-light bg-surface-secondary text-secondary hover:bg-surface',
                      ].join(' ')}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border-light bg-surface">
                          <FileText size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-primary">{skill.id}</div>
                          <div className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{skill.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col bg-surface">
            {selectedSkill ? (
              <>
                <div className="border-b border-border-light px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-muted">Skill detail</div>
                      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-primary">{selectedSkill.id}</h1>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">{selectedSkill.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant={previewMode === 'preview' ? 'secondary' : 'ghost'} onClick={() => setPreviewMode('preview')}>
                        <Eye size={14} />
                        Preview
                      </Button>
                      <Button variant={previewMode === 'raw' ? 'secondary' : 'ghost'} onClick={() => setPreviewMode('raw')}>
                        <Code2 size={14} />
                        Raw
                      </Button>
                      <DropdownMenu
                        trigger={({ toggle }) => (
                          <IconButton onClick={toggle} label="More" className="border border-border-light bg-surface-secondary">
                            <MoreHorizontal size={14} />
                          </IconButton>
                        )}
                        width={180}
                      >
                        <DropdownMenuItem onClick={openEditEditor}>Edit skill</DropdownMenuItem>
                        <DropdownMenuItem destructive onClick={() => void deleteSelectedSkill()}>
                          {deleting ? 'Deleting...' : 'Delete skill'}
                        </DropdownMenuItem>
                      </DropdownMenu>
                    </div>
                  </div>

                  {selectedSkill.tools.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedSkill.tools.map((tool) => (
                        <span key={tool} className="rounded-full border border-border bg-surface-secondary px-2 py-1 text-xs text-secondary">
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                  {previewMode === 'preview' ? (
                    <div className="rounded-[28px] border border-border-light bg-surface-secondary p-5">
                      <Markdown content={selectedSkill.prompt_addendum || '_No instructions yet._'} />
                    </div>
                  ) : (
                    <pre className="m-0 whitespace-pre-wrap rounded-[28px] border border-border-light bg-surface-secondary p-5 font-mono text-xs leading-6 text-primary">
                      {detailDocument}
                    </pre>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-muted">Select a skill to inspect or create one from the plus menu.</div>
            )}
          </div>
        </>
      )}

      {editorOpen && (
        <Modal onClose={() => setEditorOpen(false)} maxWidth="max-w-3xl" className="border border-border-light bg-surface">
          <ModalHeader
            title={editorMode === 'import' ? 'Import skill markdown' : editorMode === 'edit' ? 'Edit skill' : 'Create skill'}
            onClose={() => setEditorOpen(false)}
          />
          <ModalBody className="flex flex-col gap-4">
            <Input label="Skill id" value={draftId} disabled={editorMode === 'edit'} onChange={(event) => setDraftId(event.target.value)} placeholder="weekly-status-report" />

            {editorMode === 'import' ? (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-primary">Markdown</label>
                <Textarea
                  value={importMarkdown}
                  onChange={(event) => setImportMarkdown(event.target.value)}
                  maxHeight={360}
                  placeholder="Paste full SKILL.md contents here"
                  className="rounded-lg border border-border-light bg-surface px-3 py-2"
                />
                <div className="mt-2 flex items-start gap-2 rounded-2xl border border-border-light bg-surface-secondary px-3 py-3 text-xs text-muted">
                  <FileUp size={14} className="mt-0.5 flex-shrink-0" />
                  Include YAML frontmatter with at least `description`, and optionally `tools`.
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-primary">Description</label>
                  <Textarea
                    value={draftDescription}
                    onChange={(event) => setDraftDescription(event.target.value)}
                    maxHeight={120}
                    placeholder="Generate weekly status reports from recent work..."
                    className="rounded-lg border border-border-light bg-surface px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-primary">Instructions</label>
                  <Textarea
                    value={draftInstructions}
                    onChange={(event) => setDraftInstructions(event.target.value)}
                    maxHeight={300}
                    placeholder="Summarize recent work in three sections: wins, blockers, and next steps..."
                    className="rounded-lg border border-border-light bg-surface px-3 py-2"
                  />
                </div>

                <Input label="Tools (comma separated)" value={draftTools} onChange={(event) => setDraftTools(event.target.value)} placeholder="bash, file_read, grep" />
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <div className="flex items-center gap-2 text-xs text-muted">
              <AlertCircle size={13} />
              Skills are stored in your user scope and merged with built-ins.
            </div>
            <div className="flex items-center gap-2.5">
              <Button variant="secondary" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void (editorMode === 'import' ? importSkillMarkdown() : saveSkill())} disabled={saving}>
                {saving ? 'Saving...' : editorMode === 'import' ? 'Import' : editorMode === 'create' ? 'Create' : 'Save'}
              </Button>
            </div>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
