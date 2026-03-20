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
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { ApiConfig } from '../../api/client';
import { ApiError, listSkills, removeSkill, upsertSkill } from '../../api/client';
import type { SkillRecord } from '../../api/types';
import { Markdown } from '../markdown/Markdown';
import { toastApiError, toastInfo, toastSuccess, toastWarning } from '../../lib/toast';

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

  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
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

  const canUseApi = useMemo(() => Boolean(config.apiKey), [config.apiKey]);
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

  const createMenuRef = useRef<HTMLDivElement | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

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
  }, [canUseApi, config.baseUrl, config.apiKey]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (createMenuOpen && createMenuRef.current && !createMenuRef.current.contains(target)) {
        setCreateMenuOpen(false);
      }

      if (actionsMenuOpen && actionsMenuRef.current && !actionsMenuRef.current.contains(target)) {
        setActionsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [actionsMenuOpen, createMenuOpen]);

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
    setCreateMenuOpen(false);
  };

  const openEditEditor = () => {
    if (!selectedSkill) return;
    setEditorMode('edit');
    setDraftId(selectedSkill.id);
    setDraftDescription(selectedSkill.description);
    setDraftInstructions(selectedSkill.prompt_addendum);
    setDraftTools(selectedSkill.tools.join(', '));
    setEditorOpen(true);
    setActionsMenuOpen(false);
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
      setActionsMenuOpen(false);
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
    <div className="flex flex-1 h-full overflow-hidden app-ui" style={{ background: '#F4F3EF' }}>
      {!canUseApi ? (
        <div className="flex-1 flex items-center justify-center" style={{ fontFamily: 'Inter', fontSize: 13, color: '#888888' }}>
          Add an API key in settings to manage skills.
        </div>
      ) : (
        <>
          <div className="flex flex-col h-full" style={{ width: 332, borderRight: '1px solid #D6D4CE', background: '#F4F3EF' }}>
            <div className="flex items-center justify-between" style={{ padding: '14px 14px 10px 14px', borderBottom: '1px solid #D6D4CE' }}>
              <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.2, color: '#171717' }}>Skills</div>
              <div className="flex items-center" style={{ gap: 6 }}>
                <button
                  type="button"
                  onClick={() => void loadSkills(selectedId)}
                  disabled={unsupportedApi}
                  style={{
                    width: 32,
                    height: 30,
                    borderRadius: 10,
                    border: '1px solid #D7D5CF',
                    background: '#ECE9E2',
                    color: '#222222',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: unsupportedApi ? 0.45 : 1,
                    cursor: unsupportedApi ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Search size={15} strokeWidth={1.8} />
                </button>

                <div className="relative" ref={createMenuRef}>
                  <button
                    type="button"
                    onClick={() => setCreateMenuOpen((v) => !v)}
                    disabled={unsupportedApi}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 10,
                      border: '1px solid #D7D5CF',
                      background: '#ECE9E2',
                      color: '#222222',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: unsupportedApi ? 0.45 : 1,
                      cursor: unsupportedApi ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Plus size={15} strokeWidth={1.8} />
                  </button>

                  {createMenuOpen && !unsupportedApi && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 44,
                        right: 0,
                        zIndex: 20,
                        width: 260,
                        borderRadius: 18,
                        border: '1px solid #BDBAB3',
                        background: '#F7F6F3',
                        boxShadow: '0 10px 24px rgba(0,0,0,0.12)',
                        padding: 8,
                      }}
                    >
                      <button
                        type="button"
                        onClick={openCreateEditor}
                        className="w-full flex items-center"
                        style={{
                          gap: 8,
                          textAlign: 'left',
                          borderRadius: 14,
                          padding: '6px 9px',
                          background: 'transparent',
                          fontSize: 13,
                          color: '#343434',
                        }}
                      >
                        <FileText size={14} strokeWidth={1.8} />
                        Write skill instructions
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCreateMenuOpen(false);
                          toastInfo('Upload a skill', 'Coming soon.');
                        }}
                        className="w-full flex items-center"
                        style={{
                          gap: 8,
                          textAlign: 'left',
                          borderRadius: 14,
                          padding: '6px 9px',
                          background: 'transparent',
                          fontSize: 13,
                          color: '#343434',
                        }}
                      >
                        <Upload size={14} strokeWidth={1.8} />
                        Upload a skill
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ padding: 12, borderBottom: '1px solid #DDDAD3' }}>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search skills"
                className="w-full px-3 py-2 rounded-lg border border-[#D4D0C9] text-[14px] outline-none"
                style={{ background: '#FAF9F6' }}
              />
            </div>

            <div className="flex-1 overflow-y-auto" style={{ padding: '8px 8px 14px 8px' }}>
              {unsupportedApi && (
                <div
                  style={{
                    margin: '0 6px 10px 6px',
                    borderRadius: 10,
                    border: '1px solid #D7C7AF',
                    background: '#FFF8EE',
                    color: '#6D4C1D',
                    fontSize: 11,
                    lineHeight: 1.4,
                    padding: '8px 8px',
                  }}
                >
                  Skills endpoint is missing (`/v1/skills` returns 404). Restart/update the API server.
                </div>
              )}

              <div className="flex items-center" style={{ gap: 6, padding: '0 8px 6px 8px', color: '#6E6A64', fontSize: 12 }}>
                <ChevronDown size={17} />
                <span style={{ fontSize: 14 }}>Examples</span>
              </div>

              <div className="flex flex-col" style={{ gap: 2 }}>
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
                        className="w-full flex items-center"
                        style={{
                          textAlign: 'left',
                          borderRadius: 12,
                          padding: '8px 10px',
                          background: selected ? '#EAE8E2' : 'transparent',
                          color: selected ? '#252525' : '#4A4A4A',
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 8,
                            border: '1px solid #D5D3CC',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#F7F6F3',
                          }}
                        >
                          <FileText size={14} />
                        </div>
                         <div style={{ fontSize: 14, fontWeight: selected ? 600 : 500, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {skill.id}
                        </div>
                        {selected ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                      </button>

                      {selected && (
                        <div className="flex flex-col" style={{ paddingLeft: 40, paddingTop: 2, gap: 2 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveNode('skill-md');
                              setPreviewMode('preview');
                            }}
                            className="flex items-center"
                            style={{
                              gap: 6,
                              color: activeNode === 'skill-md' ? '#2F2F2F' : '#6C6861',
                              fontSize: 12,
                              padding: '5px 7px',
                              borderRadius: 8,
                              background: activeNode === 'skill-md' ? '#ECE9E2' : 'transparent',
                            }}
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
                            className="flex items-center"
                            style={{ gap: 6, color: '#8A867F', fontSize: 12, padding: '4px 7px', borderRadius: 8 }}
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
                            className="text-left"
                            style={{
                              color: '#8A867F',
                              fontSize: 12,
                              padding: '4px 7px',
                              borderRadius: 8,
                            }}
                          >
                            LICENSE.txt
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredSkills.length === 0 && (
                  <div style={{ padding: '10px 9px', color: '#7A7771', fontSize: 12 }}>No matching skills.</div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col h-full" style={{ background: '#F7F6F2' }}>
            {selectedSkill ? (
              <>
                <div className="flex items-center justify-between" style={{ padding: '14px 16px 8px 16px', borderBottom: '1px solid #D6D4CE' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#191919', letterSpacing: -0.25 }}>{selectedSkill.id}</div>
                  <div className="flex items-center" style={{ gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedSkill) return;
                        setEnabledBySkillId((prev) => ({
                          ...prev,
                          [selectedSkill.id]: !(prev[selectedSkill.id] ?? true),
                        }));
                      }}
                      style={{
                        width: 34,
                        height: 20,
                        borderRadius: 999,
                        border: '1px solid #CBC8C1',
                        background: selectedEnabled ? '#F0EEE8' : '#E5E2DA',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 2px',
                      }}
                    >
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 22,
                          background: '#FFFFFF',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                          transform: selectedEnabled ? 'translateX(18px)' : 'translateX(0px)',
                          transition: 'transform 150ms ease',
                        }}
                      />
                    </button>

                    <div className="relative" ref={actionsMenuRef}>
                      <button
                        type="button"
                        onClick={() => setActionsMenuOpen((v) => !v)}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 8,
                          border: '1px solid #D4D1CA',
                          background: '#F1EFEA',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#2B2B2B',
                        }}
                      >
                        <MoreHorizontal size={13} />
                      </button>

                      {actionsMenuOpen && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 40,
                            right: 0,
                            zIndex: 20,
                            minWidth: 180,
                            borderRadius: 18,
                            border: '1px solid #BDBAB3',
                            background: '#F7F6F3',
                            boxShadow: '0 10px 24px rgba(0,0,0,0.12)',
                            padding: 8,
                          }}
                        >
                          <button
                            type="button"
                            onClick={openEditEditor}
                            className="w-full flex items-center"
                            style={{
                              gap: 8,
                              textAlign: 'left',
                              borderRadius: 14,
                              padding: '6px 9px',
                              background: 'transparent',
                              fontSize: 13,
                              color: '#343434',
                            }}
                          >
                            Edit instructions
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteSelectedSkill()}
                            disabled={deleting}
                            className="w-full flex items-center"
                            style={{
                              gap: 8,
                              textAlign: 'left',
                              borderRadius: 14,
                              padding: '6px 9px',
                              background: 'transparent',
                              fontSize: 13,
                              color: '#B42318',
                            }}
                          >
                            {deleting ? 'Deleting...' : 'Delete skill'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto" style={{ padding: '12px 16px 18px 16px' }}>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, color: '#6D6962', marginBottom: 2 }}>Added by</div>
                      <div style={{ fontSize: 17, color: '#161616', fontWeight: 500 }}>Global</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: '#6D6962', marginBottom: 2 }}>Invoked by</div>
                      <div style={{ fontSize: 17, color: '#161616', fontWeight: 500 }}>User or Agent</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div className="flex items-center" style={{ gap: 6, fontSize: 13, color: '#6D6962', marginBottom: 4 }}>
                      Description <Info size={14} />
                    </div>
                    <div style={{ fontSize: 16, lineHeight: 1.42, color: '#202020' }}>{selectedSkill.description}</div>
                  </div>

                  <div style={{ height: 1, background: '#D9D6CF', marginBottom: 20 }} />

                    <div
                      style={{
                        borderRadius: 18,
                        border: '1px solid #D2D0C8',
                        background: '#FAF9F6',
                        padding: 14,
                      }}
                    >
                    <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 12, color: '#6D6962' }}>Instruction file</div>
                      <div className="flex items-center" style={{ gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => setPreviewMode('preview')}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 10,
                            border: previewMode === 'preview' ? '1px solid #C7C4BC' : '1px solid transparent',
                            background: previewMode === 'preview' ? '#EFEDE7' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#3A3A3A',
                          }}
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewMode('raw')}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 10,
                            border: previewMode === 'raw' ? '1px solid #C7C4BC' : '1px solid transparent',
                            background: previewMode === 'raw' ? '#EFEDE7' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#3A3A3A',
                          }}
                        >
                          <Code2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div style={{ height: 1, background: '#D9D6CF', marginBottom: 14 }} />

                    {previewMode === 'preview' ? (
                      <Markdown content={selectedSkill.prompt_addendum || '_No instructions yet._'} />
                    ) : (
                      <pre
                        style={{
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace',
                          fontSize: 12,
                          lineHeight: 1.45,
                          color: '#252525',
                          background: '#F3F2EE',
                          border: '1px solid #D8D5CE',
                          borderRadius: 12,
                          padding: 12,
                        }}
                      >
                        {detailDocument}
                      </pre>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center" style={{ color: '#78756E', fontSize: 13 }}>
                {loading ? 'Loading skills...' : 'No skills found. Create one from the + menu.'}
              </div>
            )}
          </div>
        </>
      )}

      {editorOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(25, 24, 22, 0.46)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              width: 'min(800px, 100%)',
              maxHeight: '92vh',
              overflowY: 'auto',
              borderRadius: 24,
              border: '1px solid #D5D3CC',
              background: '#FAF9F6',
              boxShadow: '0 24px 60px rgba(0,0,0,0.24)',
            }}
          >
            <div className="flex items-center justify-between" style={{ padding: '20px 22px 10px 22px' }}>
              <div style={{ fontSize: 30, lineHeight: 1.1, fontWeight: 700, color: '#151515' }}>Write skill instructions</div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 10,
                  border: '1px solid #D6D3CC',
                  background: '#F1EFEA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64615A',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '8px 22px 22px 22px' }}>
              <div className="flex flex-col" style={{ gap: 14 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: '#333333' }}>
                    Skill name
                  </label>
                  <input
                    type="text"
                    value={draftId}
                    disabled={editorMode === 'edit'}
                    onChange={(event) => setDraftId(event.target.value)}
                    placeholder="weekly-status-report"
                    className="w-full px-4 py-2.5 rounded-2xl border text-[14px] outline-none"
                    style={{
                      borderColor: '#CFCDC6',
                      background: editorMode === 'edit' ? '#ECE9E2' : '#FDFCF9',
                      color: '#2F2F2F',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: '#333333' }}>
                    Description
                  </label>
                  <textarea
                    value={draftDescription}
                    onChange={(event) => setDraftDescription(event.target.value)}
                    rows={3}
                    placeholder="Generate weekly status reports from recent work..."
                    className="w-full px-4 py-2.5 rounded-2xl border text-[14px] outline-none"
                    style={{ borderColor: '#CFCDC6', background: '#FDFCF9', color: '#2F2F2F', resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: '#333333' }}>
                    Instructions
                  </label>
                  <textarea
                    value={draftInstructions}
                    onChange={(event) => setDraftInstructions(event.target.value)}
                    rows={11}
                    placeholder="Summarize my recent work in three sections: wins, blockers, and next steps..."
                    className="w-full px-4 py-3 rounded-2xl border text-[14px] outline-none"
                    style={{ borderColor: '#CFCDC6', background: '#FDFCF9', color: '#2F2F2F', resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 7, fontSize: 12, fontWeight: 500, color: '#5A5751' }}>
                    Tools (comma separated)
                  </label>
                  <input
                    type="text"
                    value={draftTools}
                    onChange={(event) => setDraftTools(event.target.value)}
                    placeholder="bash, file_read, grep"
                    className="w-full px-4 py-2.5 rounded-2xl border text-[13px] outline-none"
                    style={{ borderColor: '#CFCDC6', background: '#FDFCF9', color: '#2F2F2F' }}
                  />
                </div>

                <div className="flex items-center justify-end" style={{ gap: 10, marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => setEditorOpen(false)}
                    style={{
                      borderRadius: 16,
                      border: '1px solid #C9C7C0',
                      background: '#F6F5F2',
                      color: '#2B2B2B',
                      fontSize: 13,
                      fontWeight: 500,
                      padding: '6px 14px',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveSkill()}
                    disabled={saving}
                    style={{
                      borderRadius: 16,
                      border: '1px solid #9B9891',
                      background: '#8F8D86',
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontWeight: 600,
                      padding: '6px 14px',
                      opacity: saving ? 0.75 : 1,
                    }}
                  >
                    {saving ? 'Saving...' : editorMode === 'create' ? 'Create' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
