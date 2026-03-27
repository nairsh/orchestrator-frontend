import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, FileUp, Loader2, MoreHorizontal, Plus, Search, Sparkles, X } from 'lucide-react';
import { Tag, Alert } from '@lobehub/ui';
import type { ApiConfig } from '../../api/client';
import { ApiError, importSkill, listSkills, removeSkill, upsertSkill } from '../../api/client';
import type { SkillRecord } from '../../api/types';
import { Markdown } from '../markdown/Markdown';
import { toastApiError, toastSuccess, toastWarning } from '../../lib/toast';
import { Button, DropdownMenu, DropdownMenuItem, IconButton, Input, Modal, ModalBody, ModalFooter, ModalHeader, Textarea } from '../ui';
import { RelayEmpty } from '../shared/RelayEmpty';

/** Convert a slug like "weekly-status-report" → "Weekly Status Report" */
function formatSkillName(id: string): string {
  return id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Convert a human name like "Weekly Status Report" → "weekly-status-report" */
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64);
}

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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('create');
  const [draftName, setDraftName] = useState(''); // human-readable name (create mode)
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
        formatSkillName(skill.id).toLowerCase().includes(query) ||
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
    setDraftName('');
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
    // In create mode, derive the ID from the human name
    const id = editorMode === 'create' ? nameToSlug(draftName) : draftId.trim();
    const description = draftDescription.trim();

    if (editorMode === 'create' && !draftName.trim()) {
      toastWarning('Missing name', 'Give your skill a name.');
      return;
    }
    if (!validateId(id)) return;
    if (!description) {
      toastWarning('Missing description', 'Skill description is required.');
      return;
    }

    setSaving(true);
    try {
      const response = await upsertSkill(config, id, {
        name: draftName.trim() || id,
        description,
        prompt_addendum: draftInstructions,
        tools: parseTools(),
      });
      toastSuccess(editorMode === 'create' ? 'Skill created' : 'Skill updated', formatSkillName(response.skill.id));
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

  const deleteSkillById = async (id: string) => {
    setDeleting(true);
    try {
      await removeSkill(config, id);
      toastSuccess('Skill deleted', formatSkillName(id));
      setDeleteConfirmId(null);
      if (selectedId === id) setSelectedId(null);
      await loadSkills();
    } catch (error) {
      toastApiError(error, 'Failed to delete skill');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full flex-1 overflow-hidden bg-surface-warm font-sans">
      {!canUseApi ? (
        <div className="flex flex-1 items-center justify-center">
          <RelayEmpty
            title="Sign in required"
            description="Sign in to manage skills."
          />
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between flex-shrink-0 px-8 pt-8 pb-2">
            <h1 className="text-xl font-semibold text-primary font-display">Skills</h1>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search skills"
                  className="pl-9 pr-3 py-2 rounded-lg border border-border-light bg-surface text-sm text-primary placeholder:text-placeholder outline-none w-[200px]"
                />
              </div>
              <Button onClick={openCreateEditor}>
                <Plus size={14} />
                Create skill
              </Button>
            </div>
          </div>

          {/* Description */}
          <div className="px-8 pb-4">
            <p className="text-sm text-secondary leading-relaxed">
              Extend what your computer can do with reusable capabilities and actions.
              Skills are applied automatically when needed.
            </p>
          </div>

          {/* Skills grid */}
          <div className="flex-1 overflow-y-auto px-8 pb-8">
            {unsupportedApi && (
              <Alert className="mb-4" type="warning" title="Skills are not available on this server. Check that your server supports the skills API." variant="outlined" />
            )}

            {filteredSkills.length === 0 ? (
              <RelayEmpty
                icon={<Sparkles size={26} className="text-muted" />}
                title={loading ? 'Loading skills…' : 'No skills found'}
                description={loading ? 'Fetching your skills from the server.' : 'Create your first skill to extend what your computer can do.'}
                action={!loading ? <Button onClick={openCreateEditor}><Plus size={14} /> Create skill</Button> : undefined}
              />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredSkills.map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => setSelectedId(skill.id)}
                    className={[
                      'rounded-xl border px-5 py-4 text-left transition-colors duration-150 flex items-start justify-between gap-3',
                      selectedId === skill.id
                        ? 'border-border bg-surface shadow-sm'
                        : 'border-border-light bg-surface hover:border-border hover:shadow-xs',
                    ].join(' ')}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-primary">{formatSkillName(skill.id)}</div>
                      <div className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted">{skill.description}</div>
                    </div>
                    <DropdownMenu
                      trigger={({ toggle }) => (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggle(); }}
                          className="flex items-center justify-center w-7 h-7 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-colors flex-shrink-0 cursor-pointer"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      )}
                      width={180}
                    >
                      <DropdownMenuItem onClick={() => {
                        setSelectedId(skill.id);
                        openEditEditor();
                      }}>Edit skill</DropdownMenuItem>
                      <DropdownMenuItem destructive onClick={() => {
                        setDeleteConfirmId(skill.id);
                      }}>
                        Delete skill
                      </DropdownMenuItem>
                    </DropdownMenu>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Skill detail panel (shown when a skill is selected) */}
          {selectedSkill && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" role="button" tabIndex={0} aria-label="Close skill details" onClick={() => setSelectedId(null)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedId(null); }}>
              <div className="bg-surface rounded-2xl border border-border shadow-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-5 border-b border-border-light">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-primary">{formatSkillName(selectedSkill.id)}</h2>
                      <p className="mt-2 text-sm text-secondary">{selectedSkill.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => { openEditEditor(); }}>Edit</Button>
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        className="flex items-center justify-center w-8 h-8 rounded-full text-muted hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer"
                        aria-label="Close skill details"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                  {selectedSkill.tools.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedSkill.tools.map((tool) => (
                        <Tag key={tool} size="small">{tool}</Tag>
                      ))}
                    </div>
                  )}
                </div>
                <div className="px-6 py-5">
                  <Markdown content={selectedSkill.prompt_addendum || '_No instructions yet._'} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {editorOpen && (
        <Modal onClose={() => setEditorOpen(false)} maxWidth="max-w-3xl" className="border border-border-light bg-surface">
          <ModalHeader
            title={editorMode === 'import' ? 'Import skill markdown' : editorMode === 'edit' ? 'Edit skill' : 'Create skill'}
            onClose={() => setEditorOpen(false)}
          />
          <ModalBody className="flex flex-col gap-4">
            {editorMode === 'create' ? (
              <div>
                <Input
                  label="Name"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  placeholder="Weekly Status Report"
                  autoFocus
                />
                {draftName.trim() && (
                  <div className="mt-1.5 text-xs text-muted">
                    ID: <span className="font-mono">{nameToSlug(draftName)}</span>
                  </div>
                )}
              </div>
            ) : editorMode === 'edit' ? (
              <Input label="Name" value={formatSkillName(draftId)} disabled />
            ) : (
              <Input label="Skill ID" value={draftId} onChange={(event) => setDraftId(event.target.value)} placeholder="weekly-status-report" />
            )}

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

      {/* Inline delete confirmation */}
      {deleteConfirmId && (
        <Modal onClose={() => setDeleteConfirmId(null)} maxWidth="max-w-sm" className="border border-border-light bg-surface">
          <ModalHeader title="Delete skill" onClose={() => setDeleteConfirmId(null)} />
          <ModalBody>
            <p className="text-sm text-secondary">
              Delete <span className="font-semibold text-primary">{formatSkillName(deleteConfirmId)}</span>? This cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <div />
            <div className="flex items-center gap-2.5">
              <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => void deleteSkillById(deleteConfirmId)} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
