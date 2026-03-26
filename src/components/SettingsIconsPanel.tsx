import type { ModelInfo } from '../api/types';
import type { ModelIconOverrides } from '../lib/modelIcons';
import { MODEL_ICON_DEFINITIONS, ModelIcon, inferModelIconKey, resolveModelIconKey } from '../lib/modelIcons';
import { Select } from './ui';
import { Loader2 } from 'lucide-react';
import { Alert } from '@lobehub/ui';

const INFERRED_ICON_VALUE = '__inferred__';

interface SettingsIconsPanelProps {
  sortedModels: ModelInfo[];
  modelsStatus: 'idle' | 'loading' | 'error';
  iconOverrides: ModelIconOverrides;
  onIconSelection: (modelId: string, value: string) => void;
}

export function SettingsIconsPanel({ sortedModels, modelsStatus, iconOverrides, onIconSelection }: SettingsIconsPanelProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-border-light bg-surface p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted">Visual identity</div>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-primary">Curate the model catalog so it feels intentional.</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">
              Override icons per model when the inferred branding is not good enough. Changes are stored with Clerk when available, otherwise locally.
            </p>
          </div>
          {modelsStatus === 'loading' && <Loader2 size={16} className="animate-spin text-muted" />}
        </div>

        {modelsStatus === 'error' && (
          <Alert className="mt-5" type="warning" title="Could not load models from this base URL. Fix the URL or test connection first." variant="outlined" />
        )}

        {sortedModels.length === 0 && modelsStatus !== 'error' && (
          <div className="mt-5 rounded-2xl border border-border-light bg-surface-secondary px-4 py-4 text-sm text-muted">
            No models available yet for icon mapping.
          </div>
        )}

        {sortedModels.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-[24px] border border-border-light">
            <div className="max-h-[460px] divide-y divide-border-light overflow-y-auto bg-surface-secondary/60">
              {sortedModels.map((model) => {
                const autoIcon = inferModelIconKey(model.id, model.provider);
                const selectedIcon = resolveModelIconKey(model.id, model.provider, iconOverrides);
                const selectedOverride = iconOverrides[model.id] ?? INFERRED_ICON_VALUE;

                return (
                  <div key={model.id} className="grid gap-4 px-4 py-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border-light bg-surface">
                        <ModelIcon iconKey={selectedIcon} size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-primary">{model.display_name}</div>
                        <div className="mt-1 truncate text-xs text-muted">{model.id}</div>
                      </div>
                    </div>

                    <Select
                      value={selectedOverride}
                      onChange={(e) => onIconSelection(model.id, e.target.value)}
                      aria-label={`Icon for ${model.display_name}`}
                      options={[
                        { value: INFERRED_ICON_VALUE, label: `Use inferred icon (${autoIcon})` },
                        ...MODEL_ICON_DEFINITIONS.map((definition) => ({ value: definition.key, label: definition.label })),
                      ]}
                      className="rounded-2xl border-border px-4 py-3"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-4 text-xs text-muted">
          Drop custom files into <code>public/model-icons</code>, then register new keys in <code>src/lib/modelIcons.tsx</code>.
        </div>
      </section>
    </div>
  );
}
