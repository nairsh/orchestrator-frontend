import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, ChevronRight, Loader2, RefreshCcw, Sparkles } from 'lucide-react';
import {
  checkHealth,
  disconnectConnector,
  getModelPreferences,
  getModels,
  listConnectorProviders,
  listConnectors,
  resetModelPreferences,
  saveModelPreferences,
  startConnectorOAuth,
  validateConnector,
} from '../api/client';
import type {
  AgentType,
  ConnectorProvider,
  ConnectorProviderInfo,
  ConnectorRecord,
  ModelInfo,
  ModelPreferences,
} from '../api/types';
import { toastApiError, toastInfo, toastSuccess } from '../lib/toast';
import {
  MODEL_ICON_DEFINITIONS,
  ModelIcon,
  type ModelIconOverrides,
  inferModelIconKey,
  resolveModelIconKey,
} from '../lib/modelIcons';
import { Modal, ModalBody, ModalFooter, ModalHeader } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

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
  { label: string; eyebrow: string; description: string; accent: string }
> = {
  github: {
    label: 'GitHub',
    eyebrow: 'Repos, orgs, code context',
    description: 'Connect repos and organizations so workflows can reason over active code and metadata.',
    accent: 'from-[#d7f5e7] to-[#eefaf4]',
  },
  linear: {
    label: 'Linear',
    eyebrow: 'Issues, cycles, teams',
    description: 'Bring product planning and execution context directly into recurring runs and approvals.',
    accent: 'from-[#dce8ff] to-[#f2f5ff]',
  },
  notion: {
    label: 'Notion',
    eyebrow: 'Docs, knowledge, specs',
    description: 'Pull structured workspace knowledge into prompts, memory, and scheduled workflows.',
    accent: 'from-[#f3eadb] to-[#faf5ec]',
  },
};

interface SettingsModalProps {
  initialBaseUrl: string;
  clerkEnabled?: boolean;
  requiresAuth?: boolean;
  isSignedIn?: boolean;
  getAuthToken?: () => Promise<string | null>;
  onSignIn?: () => Promise<void>;
  onSignOut?: () => Promise<void>;
  userLabel?: string | null;
  initialModelIconOverrides?: ModelIconOverrides;
  onSaveModelIconOverrides?: (overrides: ModelIconOverrides) => Promise<void>;
  onSave: (baseUrl: string) => void | Promise<void>;
  onClose: () => void;
}

type Panel = 'workspace' | 'routing' | 'connectors' | 'icons';

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
    const organizations = Array.isArray(connector.metadata['organizations']) ? connector.metadata['organizations'].length : 0;
    const repositories = Array.isArray(connector.metadata['repositories']) ? connector.metadata['repositories'].length : 0;
    return [login, organizations ? `${organizations} orgs` : null, repositories ? `${repositories} repos` : null]
      .filter(Boolean)
      .join(' • ');
  }
  if (connector.provider === 'linear') {
    const viewer = connector.metadata['viewer'];
    const viewerRecord = viewer && typeof viewer === 'object' && !Array.isArray(viewer) ? (viewer as Record<string, unknown>) : {};
    const email = typeof viewerRecord['email'] === 'string' ? viewerRecord['email'] : null;
    const teams = Array.isArray(connector.metadata['teams']) ? connector.metadata['teams'].length : 0;
    return [email, teams ? `${teams} teams` : null].filter(Boolean).join(' • ');
  }
  if (connector.provider === 'notion') {
    const workspaceName = getProviderMetaValue(connector.metadata, 'workspace_name');
    const workspaceId = getProviderMetaValue(connector.metadata, 'workspace_id');
    return [workspaceName, workspaceId].filter(Boolean).join(' • ');
  }
  return connector.display_name;
};

const getStatusTone = (status: string): string => {
  if (status === 'connected') return 'text-accent';
  if (status === 'error') return 'text-danger';
  if (status === 'pending') return 'text-warning';
  return 'text-muted';
};

export function SettingsModal({
  initialBaseUrl,
  clerkEnabled = false,
  requiresAuth = false,
  isSignedIn = false,
  getAuthToken,
  onSignIn,
  onSignOut,
  userLabel,
  initialModelIconOverrides = {},
  onSaveModelIconOverrides,
  onSave,
  onClose,
}: SettingsModalProps) {
  const [panel, setPanel] = useState<Panel>('workspace');
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const [modelsStatus, setModelsStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [iconOverrides, setIconOverrides] = useState<ModelIconOverrides>(initialModelIconOverrides);

  const [preferencesStatus, setPreferencesStatus] = useState<'idle' | 'loading' | 'saving' | 'error'>('idle');
  const [modelPreferences, setModelPreferences] = useState<ModelPreferences | null>(null);
  const [routingDirty, setRoutingDirty] = useState(false);

  const [providers, setProviders] = useState<ConnectorProviderInfo[]>([]);
  const [connectors, setConnectors] = useState<ConnectorRecord[]>([]);
  const [connectorsLoading, setConnectorsLoading] = useState(false);
  const [connectorBusyProvider, setConnectorBusyProvider] = useState<ConnectorProvider | null>(null);
  const [connectorBusyId, setConnectorBusyId] = useState<string | null>(null);

  const sortedModels = useMemo(
    () => [...models].sort((a, b) => a.display_name.localeCompare(b.display_name)),
    [models]
  );

  const modelOptions = useMemo(
    () => sortedModels.map((model) => ({ value: model.id, label: `${model.display_name} (${model.provider})` })),
    [sortedModels]
  );

  const availableModelIds = useMemo(() => new Set(models.map((model) => model.id)), [models]);

  useEffect(() => {
    setIconOverrides(initialModelIconOverrides);
  }, [initialModelIconOverrides]);

  useEffect(() => {
    const base = baseUrl.trim();
    if (!base) {
      setModels([]);
      setModelPreferences(null);
      setProviders([]);
      setConnectors([]);
      setModelsStatus('idle');
      setPreferencesStatus('idle');
      return;
    }

    let cancelled = false;
    setModelsStatus('loading');
    getModels({ baseUrl: base, getAuthToken })
      .then((res) => {
        if (cancelled) return;
        setModels(res.models ?? []);
        setModelsStatus('idle');
      })
      .catch(() => {
        if (cancelled) return;
        setModels([]);
        setModelsStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [baseUrl, getAuthToken]);

  const refreshModelPreferences = async (base = baseUrl.trim()) => {
    if (!base || !isSignedIn) {
      setModelPreferences(null);
      return;
    }
    setPreferencesStatus('loading');
    try {
      const preferences = await getModelPreferences({ baseUrl: base, getAuthToken, hasAuth: isSignedIn });
      setModelPreferences(preferences);
      setRoutingDirty(false);
      setPreferencesStatus('idle');
    } catch (err) {
      setPreferencesStatus('error');
      setModelPreferences(null);
      toastApiError(err, 'Failed to load model routing');
    }
  };

  const refreshConnectors = async (base = baseUrl.trim()) => {
    if (!base || !isSignedIn) {
      setProviders([]);
      setConnectors([]);
      return;
    }
    setConnectorsLoading(true);
    try {
      const [providerRes, connectorRes] = await Promise.all([
        listConnectorProviders({ baseUrl: base, getAuthToken, hasAuth: isSignedIn }),
        listConnectors({ baseUrl: base, getAuthToken, hasAuth: isSignedIn }),
      ]);
      setProviders(providerRes.providers ?? []);
      setConnectors(connectorRes.connectors ?? []);
    } catch (err) {
      toastApiError(err, 'Failed to load connectors');
    } finally {
      setConnectorsLoading(false);
    }
  };

  useEffect(() => {
    if (!isSignedIn) {
      setModelPreferences(null);
      setProviders([]);
      setConnectors([]);
      return;
    }
    void refreshModelPreferences();
    void refreshConnectors();
  }, [baseUrl, isSignedIn]);

  const handleTest = async () => {
    setStatus('checking');
    setErrorMsg('');
    try {
      const base = baseUrl.trim();
      if (requiresAuth) {
        const token = getAuthToken ? await getAuthToken() : null;
        if (!token) {
          throw new Error('Sign in with Clerk to continue.');
        }
      }
      await checkHealth({ baseUrl: base, getAuthToken });
      setStatus('ok');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSave = async () => {
    const trimmedBaseUrl = baseUrl.trim();
    if (!trimmedBaseUrl) return;

    setSaveError('');
    setSaving(true);
    try {
      await onSave(trimmedBaseUrl);
      if (onSaveModelIconOverrides) {
        await onSaveModelIconOverrides(iconOverrides);
      }
      toastSuccess('Settings saved', 'Server settings and visual preferences are updated.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleIconSelection = (modelId: string, value: string) => {
    setIconOverrides((current) => {
      const next = { ...current };
      if (value === INFERRED_ICON_VALUE) {
        delete next[modelId];
      } else {
        next[modelId] = value;
      }
      return next;
    });
  };

  const handleRoutingChange = (agent: AgentType, value: string) => {
    setModelPreferences((current) => {
      if (!current) return current;
      const next = {
        ...current,
        agent_models: {
          ...current.agent_models,
        },
      };
      if (!value) {
        delete next.agent_models[agent];
      } else {
        next.agent_models[agent] = value;
      }
      return next;
    });
    setRoutingDirty(true);
  };

  const handleDefaultModelChange = (value: string) => {
    setModelPreferences((current) => {
      if (!current) return current;
      return {
        ...current,
        default_orchestrator_model: value,
      };
    });
    setRoutingDirty(true);
  };

  const handleSaveRouting = async () => {
    if (!modelPreferences) return;
    setPreferencesStatus('saving');
    try {
      const saved = await saveModelPreferences(
        { baseUrl: baseUrl.trim(), getAuthToken, hasAuth: isSignedIn },
        {
          default_orchestrator_model: modelPreferences.default_orchestrator_model,
          orchestrator_models: modelPreferences.orchestrator_models,
          agent_models: modelPreferences.agent_models,
          subagent_models: modelPreferences.subagent_models,
        }
      );
      setModelPreferences(saved);
      setRoutingDirty(false);
      setPreferencesStatus('idle');
      toastSuccess('Model routing updated', 'Agent-to-model mapping is now live.');
    } catch (err) {
      setPreferencesStatus('error');
      toastApiError(err, 'Failed to save model routing');
    }
  };

  const handleResetRouting = async () => {
    setPreferencesStatus('saving');
    try {
      const reset = await resetModelPreferences({ baseUrl: baseUrl.trim(), getAuthToken, hasAuth: isSignedIn });
      setModelPreferences(reset);
      setRoutingDirty(false);
      setPreferencesStatus('idle');
      toastInfo('Model routing reset', 'User-specific model preferences were cleared.');
    } catch (err) {
      setPreferencesStatus('error');
      toastApiError(err, 'Failed to reset model routing');
    }
  };

  const handleConnectProvider = async (provider: ConnectorProvider) => {
    setConnectorBusyProvider(provider);
    try {
      const { authorize_url } = await startConnectorOAuth(
        { baseUrl: baseUrl.trim(), getAuthToken, hasAuth: isSignedIn },
        provider,
        { frontend_origin: window.location.origin }
      );
      window.open(authorize_url, '_blank', 'noopener,noreferrer,width=620,height=760');
      toastInfo(`${formatProviderName(provider)} authorization opened`, 'Complete the provider dialog, then click refresh or validate.');
    } catch (err) {
      toastApiError(err, `Failed to start ${formatProviderName(provider)} connection`);
    } finally {
      setConnectorBusyProvider(null);
    }
  };

  const handleValidateConnector = async (connectorId: string) => {
    setConnectorBusyId(connectorId);
    try {
      await validateConnector({ baseUrl: baseUrl.trim(), getAuthToken, hasAuth: isSignedIn }, connectorId);
      toastSuccess('Connector refreshed');
      await refreshConnectors();
    } catch (err) {
      toastApiError(err, 'Failed to validate connector');
    } finally {
      setConnectorBusyId(null);
    }
  };

  const handleDisconnectConnector = async (connectorId: string) => {
    setConnectorBusyId(connectorId);
    try {
      await disconnectConnector({ baseUrl: baseUrl.trim(), getAuthToken, hasAuth: isSignedIn }, connectorId);
      toastSuccess('Connector disconnected');
      await refreshConnectors();
    } catch (err) {
      toastApiError(err, 'Failed to disconnect connector');
    } finally {
      setConnectorBusyId(null);
    }
  };

  const providerCards = useMemo(
    () =>
      providers.map((provider) => {
        const connected = connectors.find((connector) => connector.provider === provider.provider && connector.status !== 'disconnected');
        return { provider, connector: connected ?? null };
      }),
    [providers, connectors]
  );

  return (
    <Modal onClose={onClose} maxWidth="max-w-6xl" className="border border-border-light bg-surface shadow-modal">
      <ModalHeader title="Workspace Settings" onClose={onClose}>
        <span className="rounded-full border border-border bg-surface-secondary px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-muted">
          Relay Control Room
        </span>
      </ModalHeader>

      <ModalBody className="p-0">
        <div className="flex min-h-[700px] flex-col overflow-hidden md:flex-row">
          <aside className="w-full border-b border-border-light bg-surface-secondary/80 md:w-[250px] md:border-b-0 md:border-r">
            <div className="border-b border-border-light px-5 py-5">
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted">Environment</div>
              <div className="mt-2 text-lg font-semibold text-primary">{userLabel ? `${userLabel}'s workspace` : 'Server workspace'}</div>
              <div className="mt-1 text-sm text-secondary">
                Tune runtime routing, connector access, and how the app presents available models.
              </div>
            </div>

            <nav className="space-y-1 p-3">
              {[
                { id: 'workspace', title: 'Workspace', note: 'Connection and account status' },
                { id: 'routing', title: 'Model Routing', note: 'Agent-to-model control plane' },
                { id: 'connectors', title: 'Connectors', note: 'GitHub, Linear, Notion' },
                { id: 'icons', title: 'Visual System', note: 'Per-model icon curation' },
              ].map((item) => {
                const active = panel === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPanel(item.id as Panel)}
                    className={[
                      'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-150',
                      active
                        ? 'bg-surface text-primary shadow-sm ring-1 ring-border-light'
                        : 'text-secondary hover:bg-surface hover:text-primary',
                    ].join(' ')}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{item.title}</div>
                      <div className="mt-1 text-xs text-muted">{item.note}</div>
                    </div>
                    <ChevronRight size={14} className={active ? 'text-primary' : 'text-muted'} />
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.08),_transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)] px-5 py-5 md:px-8 md:py-7">
            {panel === 'workspace' && (
              <div className="space-y-6">
                <section className="rounded-[28px] border border-border-light bg-surface p-6 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-xl">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted">
                        <Sparkles size={12} />
                        Runtime endpoint
                      </div>
                      <h3 className="mt-3 text-2xl font-semibold tracking-tight text-primary">Point the app at the live orchestrator.</h3>
                      <p className="mt-2 text-sm leading-6 text-secondary">
                        This URL drives models, schedules, connectors, file tools, and every authenticated workflow surface.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 text-right">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-muted">Session</div>
                      <div className="mt-2 text-sm font-medium text-primary">
                        {isSignedIn ? `Signed in${userLabel ? ` as ${userLabel}` : ''}` : 'Signed out'}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {clerkEnabled ? 'Clerk-backed authentication' : 'Local mode'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                    <Input
                      label="Base URL"
                      type="text"
                      value={baseUrl}
                      onChange={(e) => {
                        setBaseUrl(e.target.value);
                        setStatus('idle');
                      }}
                      placeholder="http://localhost:8080"
                      autoFocus
                      className="rounded-2xl border-border bg-surface-secondary px-4 py-3"
                    />
                    <div className="flex items-end gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => void handleTest()}
                        disabled={status === 'checking' || saving || !baseUrl.trim()}
                        className="h-[46px] rounded-2xl px-4"
                      >
                        {status === 'checking' ? <Loader2 size={14} className="animate-spin" /> : null}
                        Test connection
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {clerkEnabled && (
                      <div className="rounded-2xl border border-border-light bg-surface-secondary p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-muted">Authentication</div>
                        <div className="mt-2 text-sm text-primary">
                          {isSignedIn ? 'Authenticated and ready for protected API routes.' : 'Not signed in yet.'}
                        </div>
                        <div className="mt-3 flex gap-2">
                          {!isSignedIn && (
                            <Button variant="secondary" onClick={() => void onSignIn?.()}>
                              Sign in with Clerk
                            </Button>
                          )}
                          {isSignedIn && (
                            <Button variant="ghost" onClick={() => void onSignOut?.()}>
                              Sign out
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="rounded-2xl border border-border-light bg-surface-secondary p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-muted">Capabilities discovered</div>
                      <div className="mt-2 text-3xl font-semibold tracking-tight text-primary">{models.length}</div>
                      <div className="mt-1 text-sm text-secondary">models available from the current endpoint</div>
                    </div>
                  </div>

                  {requiresAuth && (
                    <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/15 px-4 py-3 text-sm text-warning">
                      Sign in with Clerk to call the API. This app no longer accepts local API keys.
                    </div>
                  )}

                  {status === 'ok' && (
                    <div className="mt-4 flex items-center gap-2 rounded-2xl border border-accent/30 bg-accent/15 px-4 py-3 text-sm text-accent">
                      <Check size={15} className="flex-shrink-0" />
                      Connected successfully.
                    </div>
                  )}
                  {status === 'error' && (
                    <div className="mt-4 flex items-start gap-2 rounded-2xl border border-danger/30 bg-danger/15 px-4 py-3 text-sm text-danger">
                      <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                      <span>{errorMsg || 'Connection failed'}</span>
                    </div>
                  )}
                </section>
              </div>
            )}

            {panel === 'routing' && (
              <div className="space-y-6">
                <section className="rounded-[28px] border border-border-light bg-surface p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.2em] text-muted">Agent control plane</div>
                      <h3 className="mt-3 text-2xl font-semibold tracking-tight text-primary">Map each agent to the model that fits it best.</h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">
                        These preferences are stored server-side and are used by the orchestrator when it dispatches specialized subagents.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => void refreshModelPreferences()} disabled={!isSignedIn || preferencesStatus === 'loading'}>
                        <RefreshCcw size={14} />
                        Refresh
                      </Button>
                      <Button variant="secondary" onClick={() => void handleResetRouting()} disabled={!isSignedIn || preferencesStatus === 'saving'}>
                        Reset
                      </Button>
                      <Button variant="primary" onClick={() => void handleSaveRouting()} disabled={!routingDirty || preferencesStatus === 'saving'}>
                        {preferencesStatus === 'saving' ? 'Saving...' : 'Save routing'}
                      </Button>
                    </div>
                  </div>

                  {!isSignedIn && (
                    <div className="mt-5 rounded-2xl border border-border-light bg-surface-secondary px-4 py-4 text-sm text-secondary">
                      Sign in to manage per-user routing preferences.
                    </div>
                  )}

                  {isSignedIn && modelPreferences && (
                    <div className="mt-6 space-y-5">
                      <div className="rounded-2xl border border-border-light bg-surface-secondary p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-muted">Default orchestrator model</div>
                        <select
                          value={modelPreferences.default_orchestrator_model}
                          onChange={(e) => handleDefaultModelChange(e.target.value)}
                          aria-label="Default orchestrator model"
                          className="mt-3 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-primary"
                        >
                          {modelOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
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
                                  <div className="mt-1 text-xs text-muted">{agent}</div>
                                </div>
                                {assigned && (
                                  <span className="rounded-full border border-border bg-surface px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-muted">
                                    override
                                  </span>
                                )}
                              </div>

                              <select
                                value={assigned}
                                onChange={(e) => handleRoutingChange(agent, e.target.value)}
                                aria-label={`Model for ${AGENT_LABELS[agent]}`}
                                className="mt-4 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-primary"
                              >
                                <option value="">Use default orchestrator model</option>
                                {modelOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>

                              {invalidAssignment && (
                                <div className="mt-3 text-xs text-warning">This mapped model is no longer available from the current endpoint.</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}

            {panel === 'connectors' && (
              <div className="space-y-6">
                <section className="rounded-[28px] border border-border-light bg-surface p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.2em] text-muted">Context bridges</div>
                      <h3 className="mt-3 text-2xl font-semibold tracking-tight text-primary">Manage production connectors without leaving settings.</h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">
                        Start auth, validate token health, and disconnect providers from one place. OAuth testing is intentionally skipped, but the rest of the management surface is wired.
                      </p>
                    </div>

                    <Button variant="ghost" onClick={() => void refreshConnectors()} disabled={!isSignedIn || connectorsLoading}>
                      <RefreshCcw size={14} />
                      Refresh
                    </Button>
                  </div>

                  {!isSignedIn && (
                    <div className="mt-5 rounded-2xl border border-border-light bg-surface-secondary px-4 py-4 text-sm text-secondary">
                      Sign in to view and manage connector accounts.
                    </div>
                  )}

                  {isSignedIn && (
                    <div className="mt-6 grid gap-4 lg:grid-cols-3">
                      {providerCards.map(({ provider, connector }) => {
                        const copy = CONNECTOR_COPY[provider.provider];
                        const busy = connectorBusyProvider === provider.provider || connectorBusyId === connector?.id;
                        return (
                          <div
                            key={provider.provider}
                            className={`rounded-[24px] border border-border-light bg-gradient-to-br ${copy.accent} p-[1px] shadow-sm`}
                          >
                            <div className="h-full rounded-[23px] bg-surface/95 p-5 backdrop-blur">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted">{copy.eyebrow}</div>
                                  <div className="mt-2 text-xl font-semibold tracking-tight text-primary">{copy.label}</div>
                                </div>
                                <span className={['rounded-full border border-border bg-surface px-2 py-1 text-[11px] uppercase tracking-[0.16em]', getStatusTone(connector?.status ?? (provider.configured ? 'disconnected' : 'error'))].join(' ')}>
                                  {provider.configured ? connector?.status ?? 'ready' : 'not configured'}
                                </span>
                              </div>

                              <p className="mt-3 text-sm leading-6 text-secondary">{copy.description}</p>

                              <div className="mt-4 rounded-2xl border border-border-light bg-surface-secondary px-4 py-3">
                                <div className="text-xs uppercase tracking-[0.16em] text-muted">Scopes</div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {provider.scopes.length > 0 ? (
                                    provider.scopes.map((scope) => (
                                      <span key={scope} className="rounded-full border border-border bg-surface px-2 py-1 text-xs text-secondary">
                                        {scope}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-muted">Provider-defined at connect time</span>
                                  )}
                                </div>
                              </div>

                              <div className="mt-4 min-h-[56px] text-sm text-secondary">
                                {connector ? (
                                  <>
                                    <div className="font-medium text-primary">{connector.display_name}</div>
                                    <div className="mt-1 text-xs text-muted">{getConnectorSummary(connector) || 'Connected account metadata available.'}</div>
                                  </>
                                ) : provider.configured ? (
                                  <div className="text-sm text-muted">No account connected yet.</div>
                                ) : (
                                  <div className="text-sm text-warning">Add provider credentials on the server to enable this connector.</div>
                                )}
                              </div>

                              <div className="mt-5 flex flex-wrap gap-2">
                                <Button
                                  variant="primary"
                                  onClick={() => void handleConnectProvider(provider.provider)}
                                  disabled={!provider.configured || busy}
                                  className="rounded-2xl"
                                >
                                  {busy && connectorBusyProvider === provider.provider ? 'Opening...' : connector ? 'Reconnect' : 'Connect'}
                                </Button>
                                {connector && (
                                  <>
                                    <Button variant="secondary" onClick={() => void handleValidateConnector(connector.id)} disabled={busy} className="rounded-2xl">
                                      Validate
                                    </Button>
                                    <Button variant="ghost" onClick={() => void handleDisconnectConnector(connector.id)} disabled={busy} className="rounded-2xl">
                                      Disconnect
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            )}

            {panel === 'icons' && (
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
                    <div className="mt-5 rounded-2xl border border-warning/30 bg-warning/15 px-4 py-3 text-sm text-warning">
                      Could not load models from this base URL. Fix the URL or test connection first.
                    </div>
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

                              <select
                                value={selectedOverride}
                                onChange={(e) => handleIconSelection(model.id, e.target.value)}
                                aria-label={`Icon for ${model.display_name}`}
                                className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-primary"
                              >
                                <option value={INFERRED_ICON_VALUE}>Use inferred icon ({autoIcon})</option>
                                {MODEL_ICON_DEFINITIONS.map((definition) => (
                                  <option key={definition.key} value={definition.key}>
                                    {definition.label}
                                  </option>
                                ))}
                              </select>
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
            )}

            {saveError && (
              <div className="mt-5 flex items-start gap-2 rounded-2xl border border-danger/30 bg-danger/15 px-4 py-3 text-sm text-danger">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                <span>{saveError}</span>
              </div>
            )}
          </div>
        </div>
      </ModalBody>

      <ModalFooter className="border-t border-border-light bg-surface-secondary px-5 py-4">
        <button
          type="button"
          onClick={() => void handleTest()}
          disabled={status === 'checking' || saving || !baseUrl.trim()}
          className="flex items-center gap-1.5 text-sm text-muted transition-colors duration-150 hover:text-primary disabled:cursor-default disabled:opacity-40"
        >
          {status === 'checking' && <Loader2 size={13} className="animate-spin flex-shrink-0" />}
          Test connection
        </button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} className="rounded-2xl">
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void handleSave()} disabled={saving || !baseUrl.trim()} className="rounded-2xl">
            {saving ? 'Saving...' : 'Save settings'}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
