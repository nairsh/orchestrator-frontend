import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { checkHealth } from '../api/client';
import type { AgentType, ConnectorProvider, ConnectorRecord } from '../api/types';
import { toastApiError, toastSuccess } from '../lib/toast';
import {
  MODEL_ICON_DEFINITIONS,
  ModelIcon,
  type ModelIconOverrides,
  inferModelIconKey,
  resolveModelIconKey,
} from '../lib/modelIcons';
import { useSettingsState } from '../hooks/useSettingsState';
import { Button, Input, Select } from './ui';
import { Sidebar } from './layout/Sidebar';
import { IconGitHub, IconLinear, IconNotion, IconCheck } from './icons/CustomIcons';

const INFERRED_ICON_VALUE = '__inferred__';
const AGENT_ORDER: AgentType[] = ['research', 'deep_research', 'analyze', 'write', 'code', 'file'];
const AGENT_LABELS: Record<AgentType, string> = {
  research: 'Research',
  deep_research: 'Deep Research',
  analyze: 'Analysis',
  write: 'Writing',
  code: 'Coding',
  file: 'File Ops',
};

const CONNECTOR_COPY: Record<
  ConnectorProvider,
  { label: string; description: string; icon: React.ReactNode }
> = {
  github: {
    label: 'GitHub',
    description: 'Connect repos and organizations for code context.',
    icon: <IconGitHub size={20} />,
  },
  linear: {
    label: 'Linear',
    description: 'Bring issues, cycles, and team data into workflows.',
    icon: <IconLinear size={20} />,
  },
  notion: {
    label: 'Notion',
    description: 'Pull workspace docs and specs into prompts.',
    icon: <IconNotion size={20} />,
  },
};

type Panel = 'general' | 'routing' | 'connectors' | 'icons' | 'billing' | 'health';

const NAV_ITEMS: { id: Panel; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'routing', label: 'Model routing' },
  { id: 'connectors', label: 'Connectors' },
  { id: 'icons', label: 'Visual system' },
  { id: 'billing', label: 'Billing' },
  { id: 'health', label: 'Agent health' },
];

interface SettingsPageProps {
  initialBaseUrl: string;
  clerkEnabled?: boolean;
  requiresAuth?: boolean;
  isSignedIn?: boolean;
  getAuthToken?: () => Promise<string | null>;
  onSignIn?: () => Promise<void>;
  onSignOut?: () => Promise<void>;
  userLabel?: string | null;
  userAvatarUrl?: string | null;
  initialModelIconOverrides?: ModelIconOverrides;
  onSaveModelIconOverrides?: (overrides: ModelIconOverrides) => Promise<void>;
  onSave: (baseUrl: string) => void | Promise<void>;
  onBack: () => void;
  sidebarCollapsed?: boolean;
  onSidebarCollapsedChange?: (collapsed: boolean) => void;
  onNavigateToLanding?: () => void;
  onOpenTasks?: (nav: string) => void;
}

const formatProviderName = (provider: ConnectorProvider): string => CONNECTOR_COPY[provider].label;

const getProviderMetaValue = (metadata: Record<string, unknown>, key: string): string | null => {
  const value = metadata[key];
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number') return String(value);
  return null;
};

const getConnectorSummary = (connector: ConnectorRecord): string => {
  if (connector.provider === 'github') {
    const login = getProviderMetaValue(connector.metadata, 'login');
    const orgs = Array.isArray(connector.metadata['organizations']) ? connector.metadata['organizations'].length : 0;
    const repos = Array.isArray(connector.metadata['repositories']) ? connector.metadata['repositories'].length : 0;
    return [login, orgs ? `${orgs} orgs` : null, repos ? `${repos} repos` : null].filter(Boolean).join(' · ');
  }
  if (connector.provider === 'linear') {
    const viewer = connector.metadata['viewer'];
    const viewerRec = viewer && typeof viewer === 'object' && !Array.isArray(viewer) ? (viewer as Record<string, unknown>) : {};
    const email = typeof viewerRec['email'] === 'string' ? viewerRec['email'] : null;
    const teams = Array.isArray(connector.metadata['teams']) ? connector.metadata['teams'].length : 0;
    return [email, teams ? `${teams} teams` : null].filter(Boolean).join(' · ');
  }
  if (connector.provider === 'notion') {
    const name = getProviderMetaValue(connector.metadata, 'workspace_name');
    return name ?? connector.display_name;
  }
  return connector.display_name;
};

/* ─── Toggle Switch ─── */
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-none transition-colors',
        checked ? 'bg-primary' : 'bg-border',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform mt-0.5',
          checked ? 'translate-x-[18px] ml-0' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}

/* ─── Settings Page ─── */

export function SettingsPage({
  initialBaseUrl,
  clerkEnabled = false,
  requiresAuth = false,
  isSignedIn = false,
  getAuthToken,
  onSignIn,
  onSignOut,
  userLabel,
  userAvatarUrl,
  initialModelIconOverrides = {},
  onSaveModelIconOverrides,
  onSave,
  onBack,
  sidebarCollapsed,
  onSidebarCollapsedChange,
  onNavigateToLanding,
  onOpenTasks,
}: SettingsPageProps) {
  const [panel, setPanel] = useState<Panel>('general');
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const settings = useSettingsState({ baseUrl, isSignedIn, getAuthToken, initialModelIconOverrides });

  // Destructure for template readability
  const {
    modelsStatus, models, sortedModels, modelOptions, availableModelIds,
    preferencesStatus, modelPreferences, routingDirty,
    connectorsLoading, connectorBusyProvider, connectorBusyId, providerCards,
    iconOverrides,
  } = settings;

  /* ─── Handlers ─── */

  const handleTest = async () => {
    setStatus('checking'); setErrorMsg('');
    try {
      if (requiresAuth) { const token = getAuthToken ? await getAuthToken() : null; if (!token) throw new Error('Sign in to continue.'); }
      await checkHealth({ baseUrl: baseUrl.trim(), getAuthToken }); setStatus('ok');
    } catch (err) { setStatus('error'); setErrorMsg(err instanceof Error ? err.message : String(err)); }
  };

  const handleSave = async () => {
    if (!baseUrl.trim()) return;
    setSaving(true);
    try {
      await onSave(baseUrl.trim());
      if (onSaveModelIconOverrides) await onSaveModelIconOverrides(iconOverrides);
      toastSuccess('Settings saved');
    } catch (err) { toastApiError(err, 'Failed to save'); }
    finally { setSaving(false); }
  };

  /* ─── Render ─── */

  return (
    <div className="flex h-full overflow-hidden app-ui bg-surface-warm">
      <Sidebar
        activeNav="tasks"
        onOpenSettings={() => {}}
        onSignOut={onSignOut}
        isSignedIn={isSignedIn}
        userLabel={userLabel}
        userAvatarUrl={userAvatarUrl}
        collapsed={sidebarCollapsed}
        onCollapsedChange={onSidebarCollapsedChange}
        onNavChange={(id) => {
          if (id === 'search' || id === 'computer' || id === 'new') onNavigateToLanding?.();
          else { onOpenTasks?.(id); }
        }}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-10">
          {/* Back + Title */}
          <button
            type="button"
            onClick={onBack}
            className="text-[13px] text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer mb-2"
          >
            ← Back
          </button>
          <h1 className="font-display text-[32px] font-medium text-primary tracking-tight mb-8">
            Settings
          </h1>

          <div className="flex gap-10">
            {/* Left nav */}
            <nav className="w-[160px] flex-shrink-0">
              <div className="flex flex-col gap-[2px]">
                {NAV_ITEMS.map((item) => {
                  const active = panel === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPanel(item.id)}
                      className={[
                        'text-left px-3 py-[7px] rounded-lg text-[13.5px] border-none cursor-pointer transition-colors',
                        active
                          ? 'bg-surface-hover font-medium text-primary'
                          : 'bg-transparent text-secondary hover:text-primary hover:bg-surface-hover',
                      ].join(' ')}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Right content */}
            <div className="flex-1 min-w-0">
              {/* ── General ── */}
              {panel === 'general' && (
                <div className="space-y-8">
                  <section>
                    <h2 className="text-[15px] font-medium text-primary mb-1">Connection</h2>
                    <p className="text-[13px] text-secondary mb-5">Server endpoint for all API calls.</p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[12.5px] font-medium text-secondary mb-1.5">Base URL</label>
                        <div className="flex gap-2">
                          <Input
                            value={baseUrl}
                            onChange={(e) => { setBaseUrl(e.target.value); setStatus('idle'); }}
                            placeholder="http://localhost:8080"
                            className="flex-1"
                          />
                          <Button variant="secondary" size="sm" onClick={() => void handleTest()} disabled={status === 'checking' || !baseUrl.trim()}>
                            {status === 'checking' ? <Loader2 size={13} className="animate-spin" /> : 'Test'}
                          </Button>
                        </div>
                        {status === 'ok' && (
                          <div className="flex items-center gap-1.5 mt-2 text-[12.5px] text-accent">
                            <IconCheck size={14} /> Connected successfully
                          </div>
                        )}
                        {status === 'error' && (
                          <div className="mt-2 text-[12.5px] text-danger">{errorMsg || 'Connection failed'}</div>
                        )}
                      </div>
                    </div>
                  </section>

                  <div className="h-px bg-border" />

                  <section>
                    <h2 className="text-[15px] font-medium text-primary mb-1">Account</h2>
                    <p className="text-[13px] text-secondary mb-5">Authentication and session status.</p>
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <div className="text-[13.5px] text-primary font-medium">
                          {isSignedIn ? `Signed in${userLabel ? ` as ${userLabel}` : ''}` : 'Not signed in'}
                        </div>
                        <div className="text-[12px] text-muted mt-0.5">
                          {clerkEnabled ? 'Clerk authentication' : 'Local mode'}
                        </div>
                      </div>
                      {clerkEnabled && (
                        <Button variant="secondary" size="sm" onClick={() => void (isSignedIn ? onSignOut?.() : onSignIn?.())}>
                          {isSignedIn ? 'Sign out' : 'Sign in'}
                        </Button>
                      )}
                    </div>
                  </section>

                  <div className="h-px bg-border" />

                  <section>
                    <h2 className="text-[15px] font-medium text-primary mb-1">Models</h2>
                    <p className="text-[13px] text-secondary mb-5">Models discovered from the endpoint.</p>
                    <div className="flex items-center justify-between py-2">
                      <div className="text-[13.5px] text-primary">
                        <span className="font-medium text-[20px] mr-1.5">{models.length}</span>
                        <span className="text-secondary">models available</span>
                      </div>
                      {modelsStatus === 'loading' && <Loader2 size={14} className="animate-spin text-muted" />}
                    </div>
                  </section>

                  <div className="h-px bg-border" />

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={onBack}>Cancel</Button>
                    <Button variant="primary" size="sm" onClick={() => void handleSave()} disabled={saving || !baseUrl.trim()}>
                      {saving ? 'Saving…' : 'Save settings'}
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Model Routing ── */}
              {panel === 'routing' && (
                <div className="space-y-8">
                  <section>
                    <h2 className="text-[15px] font-medium text-primary mb-1">Agent routing</h2>
                    <p className="text-[13px] text-secondary mb-5">Map each agent type to its preferred model.</p>

                    {!isSignedIn && (
                      <div className="rounded-lg border border-border bg-surface-secondary px-4 py-3 text-[13px] text-secondary">
                        Sign in to manage routing preferences.
                      </div>
                    )}

                    {isSignedIn && modelPreferences && (
                      <div className="space-y-6">
                        <div>
                          <Select
                            label="Default orchestrator model"
                            value={modelPreferences.default_orchestrator_model}
                            onChange={(e) => settings.handleDefaultModelChange(e.target.value)}
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
                                  <div className="text-[11.5px] text-muted">{agent}</div>
                                </div>
                                <Select
                                  value={assigned}
                                  onChange={(e) => settings.handleRoutingChange(agent, e.target.value)}
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
                          <Button variant="ghost" size="sm" onClick={() => void settings.handleResetRouting()} disabled={preferencesStatus === 'saving'}>
                            Reset
                          </Button>
                          <Button variant="primary" size="sm" onClick={() => void settings.handleSaveRouting()} disabled={!routingDirty || preferencesStatus === 'saving'}>
                            {preferencesStatus === 'saving' ? 'Saving…' : 'Save routing'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* ── Connectors ── */}
              {panel === 'connectors' && (
                <div className="space-y-8">
                  <section>
                    <h2 className="text-[15px] font-medium text-primary mb-1">Connectors</h2>
                    <p className="text-[13px] text-secondary mb-5">Manage OAuth connections to external services.</p>

                    {!isSignedIn && (
                      <div className="rounded-lg border border-border bg-surface-secondary px-4 py-3 text-[13px] text-secondary">
                        Sign in to manage connectors.
                      </div>
                    )}

                    {isSignedIn && (
                      <div className="space-y-3">
                        {providerCards.map(({ provider, connector }) => {
                          const copy = CONNECTOR_COPY[provider.provider];
                          const busy = connectorBusyProvider === provider.provider || connectorBusyId === connector?.id;
                          const connected = connector?.status === 'connected';
                          return (
                            <div
                              key={provider.provider}
                              className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3.5"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-surface-secondary flex-shrink-0">
                                  {copy.icon}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[13.5px] font-medium text-primary">{copy.label}</div>
                                  {connector ? (
                                    <div className="text-[12px] text-muted truncate">{getConnectorSummary(connector)}</div>
                                  ) : (
                                    <div className="text-[12px] text-muted">{copy.description}</div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {connected && (
                                  <span className="text-[11.5px] text-accent font-medium mr-1">Connected</span>
                                )}
                                {connector && (
                                  <>
                                    <Button variant="ghost" size="sm" onClick={() => void settings.handleValidateConnector(connector.id)} disabled={busy}>
                                      Refresh
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => void settings.handleDisconnectConnector(connector.id)} disabled={busy}>
                                      Disconnect
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant={connected ? 'secondary' : 'primary'}
                                  size="sm"
                                  onClick={() => void settings.handleConnectProvider(provider.provider)}
                                  disabled={!provider.configured || busy}
                                >
                                  {busy && connectorBusyProvider === provider.provider ? 'Opening…' : connected ? 'Reconnect' : 'Connect'}
                                </Button>
                              </div>
                            </div>
                          );
                        })}

                        {connectorsLoading && (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 size={18} className="animate-spin text-muted" />
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* ── Icons ── */}
              {panel === 'icons' && (
                <div className="space-y-8">
                  <section>
                    <h2 className="text-[15px] font-medium text-primary mb-1">Model icons</h2>
                    <p className="text-[13px] text-secondary mb-5">Override the auto-detected icon for each model.</p>

                    {sortedModels.length === 0 && modelsStatus !== 'error' && (
                      <div className="rounded-lg border border-border bg-surface-secondary px-4 py-3 text-[13px] text-muted">
                        No models available yet.
                      </div>
                    )}

                    {sortedModels.length > 0 && (
                      <div className="space-y-2">
                        {sortedModels.map((model) => {
                          const autoIcon = inferModelIconKey(model.id, model.provider);
                          const selectedIcon = resolveModelIconKey(model.id, model.provider, iconOverrides);
                          const override = iconOverrides[model.id] ?? INFERRED_ICON_VALUE;
                          return (
                            <div key={model.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-secondary flex-shrink-0">
                                  <ModelIcon iconKey={selectedIcon} size={16} />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[13.5px] font-medium text-primary truncate">{model.display_name}</div>
                                  <div className="text-[11.5px] text-muted truncate">{model.id}</div>
                                </div>
                              </div>
                              <Select
                                value={override}
                                onChange={(e) => settings.handleIconSelection(model.id, e.target.value)}
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
                      <Button variant="primary" size="sm" onClick={() => void handleSave()} disabled={saving}>
                        {saving ? 'Saving…' : 'Save icons'}
                      </Button>
                    </div>
                  </section>
                </div>
              )}

              {/* ── Billing ── */}
              {panel === 'billing' && (
                <div className="space-y-8">
                  <section>
                    <h2 className="text-[15px] font-medium text-primary mb-1">Billing</h2>
                    <p className="text-[13px] text-secondary mb-5">Usage credits and transaction history.</p>
                    <div className="rounded-lg border border-border bg-surface p-4">
                      {/* Inline the billing dashboard */}
                      <BillingInline config={{ baseUrl: baseUrl.trim(), getAuthToken, hasAuth: isSignedIn }} />
                    </div>
                  </section>
                </div>
              )}

              {/* ── Health ── */}
              {panel === 'health' && (
                <div className="space-y-8">
                  <section>
                    <h2 className="text-[15px] font-medium text-primary mb-1">Agent health</h2>
                    <p className="text-[13px] text-secondary mb-5">Model availability, latency, and status.</p>
                    <div className="rounded-lg border border-border bg-surface p-4">
                      <HealthInline config={{ baseUrl: baseUrl.trim(), getAuthToken, hasAuth: isSignedIn }} />
                    </div>
                  </section>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Billing & Health wrappers (lazy import originals) ─── */

import { BillingDashboard } from './BillingDashboard';
import { AgentHealthPanel } from './AgentHealthPanel';
import type { ApiConfig } from '../api/client';

function BillingInline({ config }: { config: ApiConfig }) {
  return <BillingDashboard config={config} />;
}

function HealthInline({ config }: { config: ApiConfig }) {
  return <AgentHealthPanel config={config} />;
}
