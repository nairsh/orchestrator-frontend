import type { AgentType, ModelPreferences } from '../../api/types';
import type { SelectOption } from '../ui/Select';
import { Button, Select } from '../ui';

const AGENT_ORDER: AgentType[] = ['research', 'deep_research', 'analyze', 'write', 'code', 'file'];
const AGENT_LABELS: Record<AgentType, string> = {
  research: 'Research',
  deep_research: 'Deep Research',
  analyze: 'Analysis',
  write: 'Writing',
  code: 'Coding',
  file: 'File tasks',
};

export interface SettingsRoutingInlinePanelProps {
  isSignedIn: boolean;
  modelPreferences: ModelPreferences | null;
  modelOptions: SelectOption[];
  availableModelIds: Set<string>;
  preferencesStatus: 'idle' | 'loading' | 'saving' | 'error';
  routingDirty: boolean;
  handleDefaultModelChange: (value: string) => void;
  handleRoutingChange: (agent: AgentType, value: string) => void;
  handleResetRouting: () => Promise<void>;
  handleSaveRouting: () => Promise<void>;
}

export function SettingsRoutingInlinePanel({
  isSignedIn,
  modelPreferences,
  modelOptions,
  availableModelIds,
  preferencesStatus,
  routingDirty,
  handleDefaultModelChange,
  handleRoutingChange,
  handleResetRouting,
  handleSaveRouting,
}: SettingsRoutingInlinePanelProps) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-[15px] font-medium text-primary mb-1">AI Preferences</h2>
        <p className="text-[13px] text-secondary mb-5">Choose which AI to use for each type of work.</p>

        {!isSignedIn && (
          <div className="rounded-lg border border-border-light bg-surface-secondary px-4 py-3 text-[13px] text-secondary">
            Sign in to manage your AI preferences.
          </div>
        )}

        {isSignedIn && preferencesStatus === 'loading' && !modelPreferences && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border-light bg-surface-secondary px-4 py-3 animate-pulse h-12" />
            <div className="rounded-lg border border-border-light bg-surface-secondary px-4 py-3 animate-pulse h-12" />
            <div className="rounded-lg border border-border-light bg-surface-secondary px-4 py-3 animate-pulse h-12" />
          </div>
        )}

        {isSignedIn && modelPreferences && (
          <div className="space-y-6">
            <div>
              <Select
                label="Default AI"
                value={modelPreferences.default_orchestrator_model}
                onChange={(e) => handleDefaultModelChange(e.target.value)}
                options={modelOptions}
                className="text-[13.5px]"
              />
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-4">
              {AGENT_ORDER.map((agent) => {
                const assigned = modelPreferences.agent_models[agent] ?? '';
                const invalid = assigned && !availableModelIds.has(assigned);
                return (
                  <div key={agent} className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[13.5px] font-medium text-primary">{AGENT_LABELS[agent]}</div>
                    </div>
                    <Select
                      value={assigned}
                      onChange={(e) => handleRoutingChange(agent, e.target.value)}
                      aria-label={`Model for ${AGENT_LABELS[agent]}`}
                      placeholder="Default"
                      options={modelOptions}
                      className="w-[260px] text-[13px]"
                    />
                    {invalid && <span className="text-[11px] text-warning">Unavailable</span>}
                  </div>
                );
              })}
            </div>

            <div className="h-px bg-border" />

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => void handleResetRouting()} disabled={preferencesStatus === 'saving'}>
                Reset
              </Button>
              <Button variant="primary" size="sm" onClick={() => void handleSaveRouting()} disabled={!routingDirty || preferencesStatus === 'saving'}>
                {preferencesStatus === 'saving' ? 'Saving…' : 'Save preferences'}
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
