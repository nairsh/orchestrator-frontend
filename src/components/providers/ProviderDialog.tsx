import { Loader2, Zap } from 'lucide-react';
import type { ProviderPreset } from '../../api/types';
import { Button, Input } from '../ui';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '../ui/Modal';
import {
  DEFAULT_PRESETS,
  PROVIDER_OPTIONS,
  getProviderIcon,
  type ProviderDialogState,
} from './providerConstants';

interface ProviderDialogProps {
  state: ProviderDialogState;
  presets: Record<string, ProviderPreset>;
  saving: boolean;
  onClose: () => void;
  onStateChange: (next: ProviderDialogState) => void;
  onSubmit: () => void;
}

export function ProviderDialog({
  state,
  presets,
  saving,
  onClose,
  onStateChange,
  onSubmit,
}: ProviderDialogProps) {
  const isEditing = Boolean(state.editingId);
  const selectedPreset = presets[state.providerType] ?? DEFAULT_PRESETS[state.providerType];
  const urlEditable = selectedPreset?.urlEditable ?? true;
  const canSubmit = Boolean(
    state.displayName.trim() && state.apiUrl.trim() && (isEditing || state.apiKey.trim())
  );

  const update = (patch: Partial<ProviderDialogState>) => onStateChange({ ...state, ...patch });

  return (
    <Modal onClose={onClose} maxWidth="max-w-2xl" className="border border-border-light bg-surface shadow-modal">
      <ModalHeader title={isEditing ? 'Edit AI service' : 'Add AI service'} onClose={onClose} />

      <ModalBody className="space-y-5 px-6 py-6">
        {/* Provider picker */}
        {!isEditing && (
          <div>
            <div className="mb-2.5 text-[12px] font-medium text-secondary">Service</div>
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
            <label className="block text-[12px] font-medium text-secondary mb-1.5">Server address</label>
            <Input
              value={state.apiUrl}
              onChange={(e) => update({ apiUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              disabled={!urlEditable && !isEditing}
            />
            {state.providerType === 'litellm' && (
              <p className="mt-1 text-[11.5px] text-muted">Your LiteLLM server address, e.g. http://localhost:4000/v1</p>
            )}
          </div>
        </div>

        {/* API key */}
        <div>
          <label className="block text-[12px] font-medium text-secondary mb-1.5">
            Secret key{isEditing && <span className="ml-1 font-normal text-muted">— leave blank to keep existing</span>}
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
