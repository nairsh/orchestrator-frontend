import { useEffect, useMemo, useState } from 'react';
import type { ApiConfig } from '../../api/client';
import { ApiError, importSkill as importSkillApi, listSkills, removeSkill, upsertSkill } from '../../api/client';
import type { SkillRecord } from '../../api/types';
import { toastApiError, toastSuccess, toastWarning } from '../../lib/toast';
import { formatSkillName, nameToSlug, SKILL_ID_REGEX } from './helpers';
import type { EditorMode } from './SkillEditorModal';

export function useSkillsPageState(config: ApiConfig) {
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [unsupportedApi, setUnsupportedApi] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('create');
  const [draftName, setDraftName] = useState('');
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

  const parseTools = (): string[] =>
    draftTools.split(',').map((entry) => entry.trim()).filter(Boolean);

  const validateId = (value: string): boolean => {
    if (!value) {
      toastWarning('Skill ID required', 'Enter an ID to continue.');
      return false;
    }
    if (!SKILL_ID_REGEX.test(value)) {
      toastWarning('Invalid skill ID', 'Use lowercase letters, numbers, and hyphens only (max 64 characters).');
      return false;
    }
    return true;
  };

  const saveSkill = async () => {
    const id = editorMode === 'create' ? nameToSlug(draftName) : draftId.trim();
    const description = draftDescription.trim();
    if (editorMode === 'create' && !draftName.trim()) {
      toastWarning('Name required', 'Give your skill a name to continue.');
      return;
    }
    if (!validateId(id)) return;
    if (!description) {
      toastWarning('Description required', 'Add a short description of what this skill does.');
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
      const response = await importSkillApi(config, { skill_id: id, markdown: importMarkdown });
      toastSuccess('Skill imported', formatSkillName(response.skill.id));
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

  const handleEditSkillFromGrid = (id: string) => {
    setSelectedId(id);
    openEditEditor();
  };

  return {
    // State
    loading, unsupportedApi, selectedId, searchQuery, deleteConfirmId,
    editorOpen, editorMode, draftName, draftId, draftDescription,
    draftInstructions, draftTools, importMarkdown, saving, deleting,
    canUseApi, selectedSkill, filteredSkills,
    // Actions
    setSelectedId, setSearchQuery, setDeleteConfirmId, setEditorOpen,
    setDraftName, setDraftId, setDraftDescription, setDraftInstructions,
    setDraftTools, setImportMarkdown,
    openCreateEditor, openEditEditor, handleEditSkillFromGrid,
    saveSkill, importSkillMarkdown, deleteSkillById,
  };
}
