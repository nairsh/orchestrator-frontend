import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Code2,
  Eye,
  FileText,
  Folder,
  Info,
  MoreHorizontal,
  Plus,
  Search,
  Upload,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { ApiConfig } from '../../api/client';
import { ApiError, listSkills, removeSkill, upsertSkill } from '../../api/client';
import type { SkillRecord } from '../../api/types';
import { Markdown } from '../markdown/Markdown';
import { toastApiError, toastInfo, toastSuccess, toastWarning } from '../../lib/toast';
import {
  Button,
  IconButton,
  Input,
  Textarea,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  DropdownMenu,
  DropdownMenuItem,
} from '../ui';

const SKILL_ID_REGEX = /^[a-z0-9-]{1,64}$/;

interface SkillsPageProps {
  config: ApiConfig;
}

export function SkillsPage({ config }: SkillsPageProps) {
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [unsupportedApi, setUnsupportedApi] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [previewMode, setPreviewMode] = useState<'preview' | 'raw'>('preview');
  const [activeNode, setActiveNode] = useState<'skill' | 'skill-md' | 'templates' | 'license'>('skill');
  const [enabledBySkillId, setEnabledBySkillId] = useState<Record<string, boolean>>({});

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [draftId, setDraftId] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftInstructions, setDraftInstructions] = useState('');
  const [draftTools, setDraftTools] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canUseApi = useMemo(() => Boolean(config.hasAuth), [config.hasAuth]);
  const selectedSkill = useMemo(
    () => (selectedId ? skills.find((skill) => skill.id === selectedId) ?? null : null),
    [skills, selectedId]
  );

  const filteredSkills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return skills;
    return skills.filter(
      (skill) =>
        skill.id.toLowerCase().includes(q) ||
        skill.description.toLowerCase().includes(q) ||
        skill.prompt_addendum.toLowerCase().includes(q)
    );
  }, [skills, searchQuery]);

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

  useEffect(() => {
    if (!selectedSkill) return;
    setEnabledBySkillId((prev) => {
      if (selectedSkill.id in prev) return prev;
      return { ...prev, [selectedSkill.id]: true };
    });
  }, [selectedSkill]);

  useEffect(() => {
    setActiveNode('skill-md');
  }, [selectedId]);

  const openCreateEditor = () => {
    setEditorMode('create');
    setDraftId('');
    setDraftDescription('');
    setDraftInstructions('');
    setDraftTools('');
    setEditorOpen(true);
  };

  const openEditEditor = () => {
    if (!selectedSkill) return;
    setEditorMode('edit');
    setDraftId(selectedSkill.id);
    setDraftDescription(selectedSkill.description);
    setDraftInstructions(selectedSkill.prompt_addendum);
    setDraftTools(selectedSkill.tools.join(', '));
    setEditorOpen(true);
  };

  const parseTools = (): string[] =>
    draftTools
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

  const saveSkill = async () => {
    const id = draftId.trim();
    const description = draftDescription.trim();

    if (!id || !description) {
      toastWarning('Missing fields', 'Skill name and description are required.');
      return;
    }

    if (!SKILL_ID_REGEX.test(id)) {
      toastWarning('Invalid skill name', 'Use lowercase letters, numbers, and dashes only (max 64 characters).');
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

  const selectedEnabled = selectedSkill ? (enabledBySkillId[selectedSkill.id] ?? true) : true;
  const detailDocument = selectedSkill
    ? `---\nname: ${selectedSkill.id}\ndescription: ${selectedSkill.description}\n---\n\n${selectedSkill.prompt_addendum}`
    : '';

  return (
    <div className="flex flex-1 h-full overflow-hidden app-ui bg-sidebar">
      {!canUseApi ? (
        <div className="flex-1 flex items-center justify-center text-sm text-placeholder">
          Sign in to manage skills.
        </div>
      ) : (
        <>
          {/* ─── Sidebar ─── */}
          <div className="flex flex-col h-full w-[332px] border-r border-border bg-sidebar">
            {/* Sidebar header */}
            <div className="flex items-center justify-between px-3.5 pt-3.5 pb-2.5 border-b border-border">
              <span className="text-xl font-semibold tracking-tight text-primary">Skills</span>
              <div className="flex items-center gap-1.5">
                <IconButton
                  onClick={() => void loadSkills(selectedId)}
                  disabled={unsupportedApi}
                  label="Refresh skills"
                  className="border border-border bg-surface-hover"
                >
                  <Search size={15} strokeWidth={1.8} />
                </IconButton>

                <DropdownMenu
                  trigger={({ toggle }) => (
                    <IconButton
                      onClick={toggle}
                      disabled={unsupportedApi}
                      label="Create skill"
                      className="border border-border bg-surface-hover"
                    >
                      <Plus size={15} strokeWidth={1.8} />
                    </IconButton>
                  )}
                  width={260}
                >
                  <DropdownMenuItem onClick={openCreateEditor}>
                    <FileText size={14} strokeWidth={1.8} />
                    Write skill instructions
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => toastInfo('Upload a skill', 'Coming soon.')}
                  >
                    <Upload size={14} strokeWidth={1.8} />
                    Upload a skill
                  </DropdownMenuItem>
                </DropdownMenu>
              </div>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-border">
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search skills"
              />
            </div>

            {/* Skill list */}
            <div className="flex-1 overflow-y-auto p-2 pb-3.5">
              {unsupportedApi && (
                <div className="mx-1.5 mb-2.5 rounded-lg border border-warning/40 bg-yellow-50 text-yellow-800 text-2xs leading-snug p-2">
                  Skills endpoint is missing (`/v1/skills` returns 404). Restart/update the API server.
                </div>
              )}

              <div className="flex items-center gap-1.5 px-2 pb-1.5 text-muted text-xs">
                <ChevronDown size={17} />
                <span className="text-sm">Examples</span>
              </div>

              <div className="flex flex-col gap-0.5">
                {filteredSkills.map((skill) => {
                  const selected = selectedId === skill.id;
                  return (
                    <div key={skill.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(skill.id);
                          setActiveNode('skill');
                        }}
                        className={[
                          'w-full flex items-center gap-2 text-left rounded-lg px-2.5 py-2 transition-colors duration-fast cursor-pointer',
                          selected ? 'bg-surface-hover text-primary' : 'text-secondary hover:bg-surface-hover/50',
                        ].join(' ')}
                      >
                        <div className="w-[26px] h-[26px] rounded-md border border-border flex items-center justify-center bg-surface-secondary shrink-0">
                          <FileText size={14} />
                        </div>
                        <span className={`text-sm flex-1 truncate ${selected ? 'font-semibold' : 'font-medium'}`}>
                          {skill.id}
                        </span>
                        {selected ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                      </button>

                      {selected && (
                        <div className="flex flex-col pl-10 pt-0.5 gap-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveNode('skill-md');
                              setPreviewMode('preview');
                            }}
                            className={[
                              'flex items-center gap-1.5 text-xs px-1.5 py-1 rounded-md transition-colors duration-fast cursor-pointer',
                              activeNode === 'skill-md' ? 'text-primary bg-surface-hover' : 'text-muted hover:text-primary',
                            ].join(' ')}
                          >
                            <FileText size={14} />
                            SKILL.md
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveNode('templates');
                              toastInfo('Templates', 'Template file browsing is coming soon.');
                            }}
                            className="flex items-center gap-1.5 text-xs text-placeholder px-1.5 py-1 rounded-md hover:text-muted cursor-pointer"
                          >
                            <Folder size={14} />
                            templates
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveNode('license');
                              toastInfo('LICENSE.txt', 'License file browsing is coming soon.');
                            }}
                            className="text-left text-xs text-placeholder px-1.5 py-1 rounded-md hover:text-muted cursor-pointer"
                          >
                            LICENSE.txt
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredSkills.length === 0 && (
                  <div className="px-2.5 py-2.5 text-muted text-xs">No matching skills.</div>
                )}
              </div>
            </div>
          </div>

          {/* ─── Detail panel ─── */}
          <div className="flex-1 flex flex-col h-full bg-surface-secondary">
            {selectedSkill ? (
              <>
                {/* Detail header */}
                <div className="flex items-center justify-between px-4 pt-3.5 pb-2 border-b border-border">
                  <h1 className="text-xl font-bold text-primary tracking-tight">{selectedSkill.id}</h1>
                  <div className="flex items-center gap-2">
                    {/* Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedSkill) return;
                        setEnabledBySkillId((prev) => ({
                          ...prev,
                          [selectedSkill.id]: !(prev[selectedSkill.id] ?? true),
                        }));
                      }}
                      className={[
                        'w-[34px] h-5 rounded-pill border flex items-center px-0.5 transition-colors duration-150 cursor-pointer',
                        selectedEnabled ? 'border-border bg-surface-hover' : 'border-border bg-surface-tertiary',
                      ].join(' ')}
                    >
                      <div
                        className="w-3 h-3 rounded-full bg-white shadow-xs transition-transform duration-150"
                        style={{ transform: selectedEnabled ? 'translateX(18px)' : 'translateX(0px)' }}
                      />
                    </button>

                    {/* Actions dropdown */}
                    <DropdownMenu
                      trigger={({ toggle }) => (
                        <IconButton
                          size="sm"
                          onClick={toggle}
                          label="Skill actions"
                          className="border border-border bg-surface-hover"
                        >
                          <MoreHorizontal size={13} />
                        </IconButton>
                      )}
                      width={180}
                    >
                      <DropdownMenuItem onClick={openEditEditor}>Edit instructions</DropdownMenuItem>
                      <DropdownMenuItem
                        destructive
                        onClick={() => void deleteSelectedSkill()}
                      >
                        {deleting ? 'Deleting...' : 'Delete skill'}
                      </DropdownMenuItem>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Detail body */}
                <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4.5">
                  <div className="grid grid-cols-2 gap-3.5 mb-2">
                    <div>
                      <div className="text-sm text-muted mb-0.5">Added by</div>
                      <div className="text-md text-primary font-medium">Global</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted mb-0.5">Invoked by</div>
                      <div className="text-md text-primary font-medium">User or Agent</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center gap-1.5 text-sm text-muted mb-1">
                      Description <Info size={14} />
                    </div>
                    <p className="text-base leading-relaxed text-primary">{selectedSkill.description}</p>
                  </div>

                  <div className="h-px bg-border mb-5" />

                  {/* Instruction file card */}
                  <div className="rounded-2xl border border-border bg-surface-warm p-3.5">
                    <div className="flex items-center justify-between mb-3.5">
                      <span className="text-xs text-muted">Instruction file</span>
                      <div className="flex items-center gap-2">
                        <IconButton
                          size="sm"
                          onClick={() => setPreviewMode('preview')}
                          label="Preview"
                          className={
                            previewMode === 'preview'
                              ? 'border border-border bg-surface-hover'
                              : 'border border-transparent'
                          }
                        >
                          <Eye size={13} />
                        </IconButton>
                        <IconButton
                          size="sm"
                          onClick={() => setPreviewMode('raw')}
                          label="Raw"
                          className={
                            previewMode === 'raw'
                              ? 'border border-border bg-surface-hover'
                              : 'border border-transparent'
                          }
                        >
                          <Code2 size={13} />
                        </IconButton>
                      </div>
                    </div>

                    <div className="h-px bg-border mb-3.5" />

                    {previewMode === 'preview' ? (
                      <Markdown content={selectedSkill.prompt_addendum || '_No instructions yet._'} />
                    ) : (
                      <pre className="m-0 whitespace-pre-wrap font-mono text-xs leading-snug text-primary bg-surface-tertiary border border-border rounded-lg p-3">
                        {detailDocument}
                      </pre>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-muted">
                {loading ? 'Loading skills...' : 'No skills found. Create one from the + menu.'}
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── Editor modal ─── */}
      {editorOpen && (
        <Modal onClose={() => setEditorOpen(false)} maxWidth="max-w-3xl">
          <ModalHeader title="Write skill instructions" onClose={() => setEditorOpen(false)} />
          <ModalBody className="flex flex-col gap-3.5">
            <Input
              label="Skill name"
              value={draftId}
              disabled={editorMode === 'edit'}
              onChange={(event) => setDraftId(event.target.value)}
              placeholder="weekly-status-report"
            />

            <div>
              <label className="block text-xs font-medium text-primary mb-1.5">Description</label>
              <Textarea
                value={draftDescription}
                onChange={(event) => setDraftDescription(event.target.value)}
                maxHeight={120}
                placeholder="Generate weekly status reports from recent work..."
                className="px-3 py-2 rounded-lg border border-border-light bg-surface"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-primary mb-1.5">Instructions</label>
              <Textarea
                value={draftInstructions}
                onChange={(event) => setDraftInstructions(event.target.value)}
                maxHeight={300}
                placeholder="Summarize my recent work in three sections: wins, blockers, and next steps..."
                className="px-3 py-2 rounded-lg border border-border-light bg-surface"
              />
            </div>

            <Input
              label="Tools (comma separated)"
              value={draftTools}
              onChange={(event) => setDraftTools(event.target.value)}
              placeholder="bash, file_read, grep"
            />
          </ModalBody>
          <ModalFooter>
            <div />
            <div className="flex items-center gap-2.5">
              <Button variant="secondary" onClick={() => setEditorOpen(false)}>Cancel</Button>
              <Button onClick={() => void saveSkill()} disabled={saving}>
                {saving ? 'Saving...' : editorMode === 'create' ? 'Create' : 'Save'}
              </Button>
            </div>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
