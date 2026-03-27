import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { createProvider, deleteProvider, getProviderPresets, listProviders, updateProvider } from '../api/client';
import type { ApiConfig } from '../api/client';
import type { ApiProvider, ProviderPreset } from '../api/types';
import { toastApiError, toastSuccess } from '../lib/toast';
import { Button } from './ui';
import { ProviderDialog } from './providers/ProviderDialog';
import { ProviderList } from './providers/ProviderList';
import {
  DEFAULT_PRESETS,
  createInitialDialogState,
  type ProviderDialogState,
} from './providers/providerConstants';

interface ProvidersSettingsPanelProps {
  config: ApiConfig;
  isSignedIn: boolean;
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
      toastApiError(err, 'Couldn\'t load AI services');
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
      toastApiError(err, 'Couldn\'t save AI service');
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
      toastApiError(err, 'Couldn\'t remove AI service');
    }
  };

  if (!isSignedIn) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-medium text-primary">AI Services</h2>
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
            <h2 className="text-[15px] font-medium text-primary">AI Services</h2>
            <p className="mt-0.5 text-[13px] text-secondary">
              Connect your own AI service accounts for more options.
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

        <ProviderList
          providers={providers}
          loading={loading}
          onAdd={openCreateDialog}
          onEdit={openEditDialog}
          onDelete={(id) => void handleDelete(id)}
        />
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
