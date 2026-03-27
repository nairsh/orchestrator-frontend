import { DeepSeek, Gemini, OpenAI, OpenRouter } from '@lobehub/icons';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Server,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { createProvider, deleteProvider, getProviderPresets, listProviders, updateProvider } from '../api/client';
import type { ApiConfig } from '../api/client';
import type { ApiProvider, ProviderPreset, ProviderType } from '../api/types';
import { toastApiError, toastSuccess } from '../lib/toast';
import { Button, Input } from './ui';
import { Modal, ModalBody, ModalFooter, ModalHeader } from './ui/Modal';

const DEFAULT_PRESETS: Record<string, ProviderPreset> = {
  openai:     { displayName: 'OpenAI',          apiUrl: 'https://api.openai.com/v1',                         urlEditable: false },
  deepseek:   { displayName: 'DeepSeek',         apiUrl: 'https://api.deepseek.com/v1',                      urlEditable: false },
  google:     { displayName: 'Google Gemini',    apiUrl: 'https://generativelanguage.googleapis.com/v1beta', urlEditable: false },
  openrouter: { displayName: 'OpenRouter',       apiUrl: 'https://openrouter.ai/api/v1',                     urlEditable: false },
  litellm:    { displayName: 'LiteLLM',          apiUrl: '',                                                  urlEditable: true  },
  custom:     { displayName: 'Custom Provider',  apiUrl: '',                                                  urlEditable: true  },
};

const PROVIDER_OPTIONS: Array<{ value: ProviderType; label: string }> = [
  { value: 'openai',     label: 'OpenAI' },
  { value: 'deepseek',   label: 'DeepSeek' },
  { value: 'google',     label: 'Google Gemini' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'litellm',    label: 'LiteLLM' },
  { value: 'custom',     label: 'Custom' },
];

interface ProvidersSettingsPanelProps {
  config: ApiConfig;
  isSignedIn: boolean;
}

interface ProviderDialogState {
  editingId: string | null;
  providerType: ProviderType;
  displayName: string;
  apiUrl: string;
  apiKey: string;
  embeddingModel: string;
  isDefaultEmbedding: boolean;
}

function getProviderIcon(type: ProviderType, size = 16): ReactNode {
  switch (type) {
    case 'openai':     return <OpenAI size={size} />;
    case 'deepseek':   return <DeepSeek size={size} />;
    case 'google':     return <Gemini size={size} />;
    case 'openrouter': return <OpenRouter size={size} />;
    case 'litellm':    return <Server size={size} />;
    default:           return <Sparkles size={size} />;
  }
}

function createInitialDialogState(
  presets: Record<string, ProviderPreset>,
  provider?: ApiProvider
): ProviderDialogState {
  if (provider) {
    return {
      editingId: provider.id,
      providerType: provider.provider_type,
      displayName: provider.display_name,
      apiUrl: provider.api_url,
      apiKey: '',
      embeddingModel: provider.embedding_model ?? '',
      isDefaultEmbedding: provider.is_default_embedding,
    };
  }
  const preset = presets.openai ?? DEFAULT_PRESETS.openai;
  return {
    editingId: null,
    providerType: 'openai',
    displayName: preset.displayName,
    apiUrl: preset.apiUrl,
    apiKey: '',
    embeddingModel: '',
    isDefaultEmbedding: false,
  };
}

function ProviderDialog({
  state,
  presets,
  saving,
  onClose,
  onStateChange,
  onSubmit,
}: {
  state: ProviderDialogState;
  presets: Record<string, ProviderPreset>;
  saving: boolean;
  onClose: () => void;
  onStateChange: (next: ProviderDialogState) => void;
  onSubmit: () => void;
}) {
  const isEditing = Boolean(state.editingId);
  const selectedPreset = presets[state.providerType] ?? DEFAULT_PRESETS[state.providerType];
  const urlEditable = selectedPreset?.urlEditable ?? true;
  const canSubmit = Boolean(
    state.displayName.trim() && state.apiUrl.trim() && (isEditing || state.apiKey.trim())
  );

  const update = (patch: Partial<ProviderDialogState>) => onStateChange({ ...state, ...patch });

  return (
    <Modal onClose={onClose} maxWidth="max-w-2xl" className="border border-border-light bg-surface shadow-modal">
      <ModalHeader title={isEditing ? 'Edit provider' : 'Add API provider'} onClose={onClose} />

      <ModalBody className="space-y-5 px-6 py-6">
        {/* Provider picker */}
        {!isEditing && (
          <div>
            <div className="mb-2.5 text-[12px] font-medium text-secondary">Provider</div>
            <div className="flex flex-wrap gap-2">
              {PROVIDER_OPTIONS.map((option) => {
                const active = state.providerType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      const preset = presets[option.value] ?? DEFAULT_PRESETS[option.value];
                      update({ providerType: option.value, displayName: preset.displayName, apiUrl: preset.apiUrl });
                    }}
                    className={[
                      'flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] cursor-pointer',
                      active
                        ? 'border-border-light bg-surface-hover text-primary font-medium'
                        : 'border-border-light bg-transparent text-secondary hover:text-primary hover:bg-surface-hover',
                    ].join(' ')}
                  >
                    {getProviderIcon(option.value, 14)}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Name + URL */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[12px] font-medium text-secondary mb-1.5">Display name</label>
            <Input
              value={state.displayName}
              onChange={(e) => update({ displayName: e.target.value })}
              placeholder="My OpenAI"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-secondary mb-1.5">API URL</label>
            <Input
              value={state.apiUrl}
              onChange={(e) => update({ apiUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              disabled={!urlEditable && !isEditing}
            />
            {state.providerType === 'litellm' && (
              <p className="mt-1 text-[11.5px] text-muted">Your LiteLLM proxy URL, e.g. http://localhost:4000/v1</p>
            )}
          </div>
        </div>

        {/* API key */}
        <div>
          <label className="block text-[12px] font-medium text-secondary mb-1.5">
            API key{isEditing && <span className="ml-1 font-normal text-muted">— leave blank to keep existing</span>}
          </label>
          <Input
            type="password"
            value={state.apiKey}
            onChange={(e) => update({ apiKey: e.target.value })}
            placeholder={isEditing ? '••••••••' : 'sk-...'}
          />
        </div>

        {/* Embeddings */}
        <div className="border-t border-border-light pt-4">
          <div className="mb-3 flex items-center gap-1.5 text-[12px] font-medium text-secondary">
            <Zap size={13} />
            Embeddings <span className="font-normal text-muted">(optional)</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <label className="block text-[12px] font-medium text-secondary mb-1.5">Embedding model</label>
              <Input
                value={state.embeddingModel}
                onChange={(e) => update({ embeddingModel: e.target.value })}
                placeholder="text-embedding-3-small"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 pb-1">
              <input
                type="checkbox"
                checked={state.isDefaultEmbedding}
                onChange={(e) => update({ isDefaultEmbedding: e.target.checked })}
                className="rounded border-border-light"
              />
              <span className="text-[13px] text-secondary">Default for search</span>
            </label>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <p className="text-[12px] text-muted">Keys are stored masked and tied to your profile.</p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onSubmit} disabled={!canSubmit || saving}>
            {saving && <Loader2 size={13} className="animate-spin" />}
            {isEditing ? 'Save changes' : 'Add provider'}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}

export function ProvidersSettingsPanel({ config, isSignedIn }: ProvidersSettingsPanelProps) {
  const [providers, setProviders] = useState<ApiProvider[]>([]);
  const [presets, setPresets] = useState<Record<string, ProviderPreset>>(DEFAULT_PRESETS);
  const [loading, setLoading] = useState(true);
  const [dialogState, setDialogState] = useState<ProviderDialogState | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchProviders = useCallback(async () => {
    if (!isSignedIn) { setLoading(false); return; }
    setLoading(true);
    try {
      const [providerList, presetMap] = await Promise.all([
        listProviders(config),
        getProviderPresets(config).catch(() => DEFAULT_PRESETS),
      ]);
      setProviders(providerList);
      setPresets(presetMap);
    } catch (err) {
      toastApiError(err, 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  }, [config, isSignedIn]);

  useEffect(() => { void fetchProviders(); }, [fetchProviders]);

  const defaultEmbeddingProvider = useMemo(
    () => providers.find((p) => p.is_default_embedding) ?? null,
    [providers]
  );

  const openCreateDialog = () => setDialogState(createInitialDialogState(presets));
  const openEditDialog = (provider: ApiProvider) => setDialogState(createInitialDialogState(presets, provider));
  const closeDialog = () => { if (!saving) setDialogState(null); };

  const handleSave = async () => {
    if (!dialogState) return;
    const isEditing = Boolean(dialogState.editingId);
    if (!dialogState.displayName.trim() || !dialogState.apiUrl.trim() || (!isEditing && !dialogState.apiKey.trim())) return;

    setSaving(true);
    try {
      if (isEditing) {
        await updateProvider(config, dialogState.editingId!, {
          display_name: dialogState.displayName.trim(),
          api_url: dialogState.apiUrl.trim(),
          ...(dialogState.apiKey.trim() ? { api_key: dialogState.apiKey.trim() } : {}),
          embedding_model: dialogState.embeddingModel.trim() || undefined,
          is_default_embedding: dialogState.isDefaultEmbedding,
        });
        toastSuccess('Provider updated');
      } else {
        await createProvider(config, {
          provider_type: dialogState.providerType,
          display_name: dialogState.displayName.trim(),
          api_url: dialogState.apiUrl.trim(),
          api_key: dialogState.apiKey.trim(),
          embedding_model: dialogState.embeddingModel.trim() || undefined,
          is_default_embedding: dialogState.isDefaultEmbedding,
        });
        toastSuccess('Provider added');
      }
      setDialogState(null);
      await fetchProviders();
    } catch (err) {
      toastApiError(err, 'Failed to save provider');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProvider(config, id);
      toastSuccess('Provider removed');
      await fetchProviders();
    } catch (err) {
      toastApiError(err, 'Failed to delete provider');
    }
  };

  if (!isSignedIn) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-medium text-primary">API Providers</h2>
            <p className="mt-0.5 text-[13px] text-secondary">Bring your own API keys for model providers.</p>
          </div>
        </div>
        <p className="text-[13px] text-muted">Sign in to manage provider credentials.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-medium text-primary">API Providers</h2>
            <p className="mt-0.5 text-[13px] text-secondary">
              Save your own provider keys and endpoints.
              {defaultEmbeddingProvider && (
                <span className="ml-1 text-muted">
                  Embeddings: {defaultEmbeddingProvider.display_name}
                  {defaultEmbeddingProvider.embedding_model && ` · ${defaultEmbeddingProvider.embedding_model}`}
                </span>
              )}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={openCreateDialog} className="gap-1.5 shrink-0">
            <Plus size={14} />
            Add
          </Button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-[13px] text-muted">
            <Loader2 size={14} className="animate-spin" />
            Loading…
          </div>
        ) : providers.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[13.5px] text-secondary">No providers added yet.</p>
            <p className="mt-1 text-[12.5px] text-muted">Add API keys for OpenAI, DeepSeek, Google, OpenRouter, or LiteLLM.</p>
            <Button variant="secondary" size="sm" onClick={openCreateDialog} className="mt-4 gap-1.5">
              <Plus size={13} /> Add provider
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {providers.map((provider) => (
              <div key={provider.id} className="flex items-center gap-3 py-3 group">
                {/* Icon */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-light bg-surface-secondary text-primary">
                  {getProviderIcon(provider.provider_type, 15)}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-medium text-primary">{provider.display_name}</span>
                    <span className="text-[11px] text-muted">{provider.provider_type}</span>
                    {provider.is_default_embedding && (
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] text-accent">embeddings</span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-[12px] text-muted">
                    <span className="truncate max-w-[200px]">{provider.api_url}</span>
                    <span className="flex items-center gap-1">
                      <KeyRound size={11} /> {provider.api_key_masked}
                    </span>
                    {provider.embedding_model && (
                      <span className="flex items-center gap-1">
                        <Zap size={11} /> {provider.embedding_model}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => openEditDialog(provider)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] text-muted hover:text-primary hover:bg-surface-hover bg-transparent border-none cursor-pointer"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(provider.id)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] text-muted hover:text-danger hover:bg-danger/10 bg-transparent border-none cursor-pointer"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {dialogState && (
        <ProviderDialog
          state={dialogState}
          presets={presets}
          saving={saving}
          onClose={closeDialog}
          onStateChange={setDialogState}
          onSubmit={() => void handleSave()}
        />
      )}
    </>
  );
}
