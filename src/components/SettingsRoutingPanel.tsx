import type { AgentType, ModelPreferences } from '../api/types';
import { Button } from './ui/Button';
import { Select } from './ui';
import { Tag } from '@lobehub/ui';
import { Loader2, RefreshCcw } from 'lucide-react';

const AGENT_ORDER: AgentType[] = ['research', 'deep_research', 'analyze', 'write', 'code', 'file'];
const AGENT_LABELS: Record<AgentType, string> = {
  research: 'Research',
  deep_research: 'Deep Research',
  analyze: 'Analysis',
  write: 'Writing',
  code: 'Coding',
  file: 'File tasks',
};

interface SettingsRoutingPanelProps {
  isSignedIn: boolean;
  modelPreferences: ModelPreferences | null;
  preferencesStatus: 'idle' | 'loading' | 'saving' | 'error';
  routingDirty: boolean;
  modelOptions: Array<{ value: string; label: string }>;
  availableModelIds: Set<string>;
  onRefresh: () => void;
  onReset: () => void;
  onSave: () => void;
  onRoutingChange: (agent: AgentType, value: string) => void;
  onDefaultModelChange: (value: string) => void;
}

export function SettingsRoutingPanel({
  isSignedIn, modelPreferences, preferencesStatus, routingDirty,
  modelOptions, availableModelIds,
  onRefresh, onReset, onSave, onRoutingChange, onDefaultModelChange,
}: SettingsRoutingPanelProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-border-light bg-surface p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted">AI Preferences</div>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-primary">Choose which AI to use for each type of work.</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">
              Pick the best AI for each kind of task. Review your changes, then save.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onRefresh} disabled={!isSignedIn || preferencesStatus === 'loading'} className="gap-1.5">
              {preferencesStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
              Refresh
            </Button>
            <Button variant="secondary" onClick={onReset} disabled={!isSignedIn || preferencesStatus === 'saving'}>
              Reset
            </Button>
            <Button variant="primary" onClick={onSave} disabled={!routingDirty || preferencesStatus === 'saving'}>
              {preferencesStatus === 'saving' ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>

        {!isSignedIn && (
          <div className="mt-5 rounded-2xl border border-border-light bg-surface-secondary px-4 py-4 text-sm text-secondary">
            Sign in to manage your AI preferences.
          </div>
        )}

        {isSignedIn && modelPreferences && (
          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-border-light bg-surface-secondary p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted">Default AI</div>
              <Select
                  value={modelPreferences.default_orchestrator_model}
                  onChange={(e) => onDefaultModelChange(e.target.value)}
                  aria-label="Default AI"
                  options={modelOptions}
                  className="mt-3 rounded-2xl border-border-light px-4 py-3"
                />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {AGENT_ORDER.map((agent) => {
                const assigned = modelPreferences.agent_models[agent] ?? '';
                const invalidAssignment = assigned && !availableModelIds.has(assigned);
                return (
                  <div key={agent} className="rounded-2xl border border-border-light bg-surface-secondary p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-primary">{AGENT_LABELS[agent]}</div>
                      </div>
                      {assigned && (
                        <Tag size="small">custom</Tag>
                      )}
                    </div>
                    <Select
                      value={assigned}
                      onChange={(e) => onRoutingChange(agent, e.target.value)}
                      aria-label={`Model for ${AGENT_LABELS[agent]}`}
                      placeholder="Use default AI"
                      options={modelOptions}
                      className="mt-4 rounded-2xl border-border-light px-4 py-3"
                    />
                    {invalidAssignment && (
                      <div className="mt-3 text-xs text-warning">This AI is no longer available.</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
