import type { ModelInfo } from '../../api/types';
import type { ModelIconOverrides } from '../../lib/modelIcons';
import { humanizeModelName } from '../../lib/modelNames';
import {
  MODEL_ICON_DEFINITIONS,
  ModelIcon,
  inferModelIconKey,
  resolveModelIconKey,
} from '../../lib/modelIcons';
import { Button, Select } from '../ui';

const INFERRED_ICON_VALUE = '__inferred__';

export interface SettingsIconsInlinePanelProps {
  sortedModels: ModelInfo[];
  modelsStatus: 'idle' | 'loading' | 'error';
  iconOverrides: ModelIconOverrides;
  saving: boolean;
  handleIconSelection: (modelId: string, value: string) => void;
  handleSave: () => void;
}

export function SettingsIconsInlinePanel({
  sortedModels,
  modelsStatus,
  iconOverrides,
  saving,
  handleIconSelection,
  handleSave,
}: SettingsIconsInlinePanelProps) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-[15px] font-medium text-primary mb-1">AI icons</h2>
        <p className="text-[13px] text-secondary mb-5">Choose a custom icon for each AI option.</p>

        {sortedModels.length === 0 && modelsStatus !== 'error' && (
          <div className="rounded-lg border border-border-light bg-surface-secondary px-4 py-3 text-[13px] text-muted">
            No AI options available yet.
          </div>
        )}

        {sortedModels.length > 0 && (
          <div className="space-y-2">
            {sortedModels.map((model) => {
              const autoIcon = inferModelIconKey(model.id, model.provider);
              const selectedIcon = resolveModelIconKey(model.id, model.provider, iconOverrides);
              const override = iconOverrides[model.id] ?? INFERRED_ICON_VALUE;
              return (
                <div key={model.id} className="flex items-center justify-between gap-3 rounded-lg border border-border-light bg-surface px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-secondary flex-shrink-0">
                      <ModelIcon iconKey={selectedIcon} size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-medium text-primary truncate">{humanizeModelName(model.display_name)}</div>
                      <div className="text-[11.5px] text-muted truncate">{humanizeModelName(model.id)}</div>
                    </div>
                  </div>
                  <Select
                    value={override}
                    onChange={(e) => handleIconSelection(model.id, e.target.value)}
                    aria-label={`Icon for ${model.display_name}`}
                    options={[
                      { value: INFERRED_ICON_VALUE, label: `Auto (${autoIcon})` },
                      ...MODEL_ICON_DEFINITIONS.map((def) => ({ value: def.key, label: def.label })),
                    ]}
                    className="w-[200px] py-1.5 text-[12.5px] flex-shrink-0"
                  />
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save icons'}
          </Button>
        </div>
      </section>
    </div>
  );
}
