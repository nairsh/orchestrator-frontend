import { useState } from 'react';
import { Check, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { Alert, Tag } from '@lobehub/ui';
import { checkHealth } from '../api/client';
import { toastApiError, toastSuccess } from '../lib/toast';
import type { ModelIconOverrides } from '../lib/modelIcons';
import { useSettingsState } from '../hooks/useSettingsState';
import { Modal, ModalBody, ModalFooter, ModalHeader } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { BillingDashboard } from './BillingDashboard';
import { AgentHealthPanel } from './AgentHealthPanel';
import { SettingsRoutingPanel } from './SettingsRoutingPanel';
import { SettingsConnectorsPanel } from './SettingsConnectorsPanel';
import { SettingsIconsPanel } from './SettingsIconsPanel';
import { ProvidersSettingsPanel } from './ProvidersSettingsPanel';

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

type Panel = 'workspace' | 'providers' | 'routing' | 'connectors' | 'icons' | 'billing' | 'health';

export function SettingsModal({
  initialBaseUrl, clerkEnabled = false, requiresAuth = false, isSignedIn = false,
  getAuthToken, onSignIn, onSignOut, userLabel,
  initialModelIconOverrides = {}, onSaveModelIconOverrides, onSave, onClose,
}: SettingsModalProps) {
  const [panel, setPanel] = useState<Panel>('workspace');
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const settings = useSettingsState({ baseUrl, isSignedIn, getAuthToken, initialModelIconOverrides });

  const apiConfig = { baseUrl: baseUrl.trim(), getAuthToken, hasAuth: isSignedIn };

  const handleTest = async () => {
    setStatus('checking'); setErrorMsg('');
    try {
      if (requiresAuth) { const token = getAuthToken ? await getAuthToken() : null; if (!token) throw new Error('Sign in to continue.'); }
      await checkHealth({ baseUrl: baseUrl.trim(), getAuthToken }); setStatus('ok');
    } catch (err) { setStatus('error'); setErrorMsg(err instanceof Error ? err.message : String(err)); }
  };

  const handleSave = async () => {
    if (!baseUrl.trim()) return;
    setSaveError(''); setSaving(true);
    try { await onSave(baseUrl.trim()); if (onSaveModelIconOverrides) await onSaveModelIconOverrides(settings.iconOverrides); toastSuccess('Settings saved', 'Server settings and visual preferences are updated.'); }
    catch (err) { setSaveError(err instanceof Error ? err.message : String(err)); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} maxWidth="max-w-6xl" className="border border-border-light bg-surface shadow-modal">
      <ModalHeader title="Workspace Settings" onClose={onClose}>
        <Tag size="small">Settings</Tag>
      </ModalHeader>

      <ModalBody className="p-0">
        <div className="flex min-h-[700px] flex-col overflow-hidden md:flex-row">
          {/* Sidebar nav */}
          <aside className="w-full border-b border-border-light bg-surface-secondary/80 md:w-[250px] md:border-b-0 md:border-r">
            <div className="border-b border-border-light px-5 py-5">
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted">Environment</div>
              <div className="mt-2 text-lg font-semibold text-primary">{userLabel ? `${userLabel}'s workspace` : 'Server workspace'}</div>
              <div className="mt-1 text-sm text-secondary">Configure your server, model preferences, and connected tools.</div>
            </div>
            <nav className="space-y-1 p-3">
              {([
                { id: 'workspace', title: 'Workspace', note: 'Connection and account status' },
                { id: 'providers', title: 'API Providers', note: 'BYOK for LLM providers' },
                { id: 'routing', title: 'Model Routing', note: 'Per-task model preferences' },
                { id: 'connectors', title: 'Connectors', note: 'GitHub, Linear, Notion' },
                { id: 'icons', title: 'Visual System', note: 'Per-model icons' },
                { id: 'billing', title: 'Billing', note: 'Usage, credits, transactions' },
                { id: 'health', title: 'Model Health', note: 'Model status and latency' },
              ] as const).map((item) => {
                const active = panel === item.id;
                return (
                  <button key={item.id} type="button" onClick={() => setPanel(item.id as Panel)}
                    className={['flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-150', active ? 'bg-surface text-primary shadow-sm ring-1 ring-border-light' : 'text-secondary hover:bg-surface hover:text-primary'].join(' ')}>
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

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.08),_transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)] px-5 py-5 md:px-8 md:py-7">
            {panel === 'workspace' && (
              <div className="space-y-6">
                <section className="rounded-[28px] border border-border-light bg-surface p-6 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-xl">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted"><Sparkles size={12} />Server connection</div>
                      <h3 className="mt-3 text-2xl font-semibold tracking-tight text-primary">Connect to your AI server.</h3>
                      <p className="mt-2 text-sm leading-6 text-secondary">This URL powers all models, tasks, connectors, and file tools in the app.</p>
                    </div>
                    <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 text-right">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-muted">Session</div>
                      <div className="mt-2 text-sm font-medium text-primary">{isSignedIn ? `Signed in${userLabel ? ` as ${userLabel}` : ''}` : 'Signed out'}</div>
                      <div className="mt-1 text-xs text-muted">{clerkEnabled ? 'Authenticated session' : 'Local mode'}</div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                    <Input label="Base URL" type="text" value={baseUrl} onChange={(e) => { setBaseUrl(e.target.value); setStatus('idle'); }} placeholder="http://localhost:8080" autoFocus className="rounded-2xl border-border-light bg-surface-secondary px-4 py-3" />
                    <div className="flex items-end gap-2">
                      <Button variant="secondary" onClick={() => void handleTest()} disabled={status === 'checking' || saving || !baseUrl.trim()} className="h-[46px] rounded-2xl px-4">
                        {status === 'checking' ? <Loader2 size={14} className="animate-spin" /> : null}
                        Test connection
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {clerkEnabled && (
                      <div className="rounded-2xl border border-border-light bg-surface-secondary p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-muted">Authentication</div>
                        <div className="mt-2 text-sm text-primary">{isSignedIn ? 'Signed in and ready.' : 'Not signed in yet.'}</div>
                        <div className="mt-3 flex gap-2">
                          {!isSignedIn && <Button variant="secondary" onClick={() => void onSignIn?.()}>Sign in</Button>}
                          {isSignedIn && <Button variant="ghost" onClick={() => void onSignOut?.()}>Sign out</Button>}
                        </div>
                      </div>
                    )}
                    <div className="rounded-2xl border border-border-light bg-surface-secondary p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-muted">Available models</div>
                      <div className="mt-2 text-3xl font-semibold tracking-tight text-primary">{settings.models.length}</div>
                      <div className="mt-1 text-sm text-secondary">models available on your server</div>
                    </div>
                  </div>

                  {requiresAuth && <Alert className="mt-4" type="warning" title="Sign in required to use this server. API key access is not enabled." variant="outlined" />}
                  {status === 'ok' && <Alert className="mt-4" type="success" title="Connected successfully." variant="outlined" />}
                  {status === 'error' && <Alert className="mt-4" type="error" title={errorMsg || 'Connection failed'} variant="outlined" />}
                </section>
              </div>
            )}

            {panel === 'providers' && (
              <ProvidersSettingsPanel
                config={apiConfig}
                isSignedIn={isSignedIn}
              />
            )}

            {panel === 'routing' && (
              <SettingsRoutingPanel
                isSignedIn={isSignedIn} modelPreferences={settings.modelPreferences} preferencesStatus={settings.preferencesStatus}
                routingDirty={settings.routingDirty} modelOptions={settings.modelOptions} availableModelIds={settings.availableModelIds}
                onRefresh={() => void settings.refreshModelPreferences()} onReset={() => void settings.handleResetRouting()}
                onSave={() => void settings.handleSaveRouting()} onRoutingChange={settings.handleRoutingChange} onDefaultModelChange={settings.handleDefaultModelChange}
              />
            )}

            {panel === 'connectors' && (
              <SettingsConnectorsPanel
                isSignedIn={isSignedIn} connectorsLoading={settings.connectorsLoading}
                connectorBusyProvider={settings.connectorBusyProvider} connectorBusyId={settings.connectorBusyId}
                providerCards={settings.providerCards} onRefresh={() => void settings.refreshConnectors()}
                onConnect={(p) => void settings.handleConnectProvider(p)} onValidate={(id) => void settings.handleValidateConnector(id)}
                onDisconnect={(id) => void settings.handleDisconnectConnector(id)}
              />
            )}

            {panel === 'icons' && (
              <SettingsIconsPanel sortedModels={settings.sortedModels} modelsStatus={settings.modelsStatus} iconOverrides={settings.iconOverrides} onIconSelection={settings.handleIconSelection} />
            )}

            {panel === 'billing' && (
              <div className="space-y-6"><section className="rounded-[28px] border border-border-light bg-surface p-6 shadow-sm"><BillingDashboard config={apiConfig} /></section></div>
            )}

            {panel === 'health' && (
              <div className="space-y-6"><section className="rounded-[28px] border border-border-light bg-surface p-6 shadow-sm"><AgentHealthPanel config={apiConfig} /></section></div>
            )}

            {saveError && (
              <Alert className="mt-5" type="error" title={saveError} variant="outlined" />
            )}
          </div>
        </div>
      </ModalBody>

      <ModalFooter className="border-t border-border-light bg-surface-secondary px-5 py-4">
        <button type="button" onClick={() => void handleTest()} disabled={status === 'checking' || saving || !baseUrl.trim()}
          className="flex items-center gap-1.5 text-sm text-muted transition-colors duration-150 hover:text-primary disabled:cursor-default disabled:opacity-40">
          {status === 'checking' && <Loader2 size={13} className="animate-spin flex-shrink-0" />}
          Test connection
        </button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} className="rounded-2xl">Cancel</Button>
          <Button variant="primary" onClick={() => void handleSave()} disabled={saving || !baseUrl.trim()} className="rounded-2xl">
            {saving ? 'Saving...' : 'Save settings'}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
