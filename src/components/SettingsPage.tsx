import { useState } from 'react';
import { checkHealth } from '../api/client';
import { toastApiError, toastSuccess } from '../lib/toast';
import type { ModelIconOverrides } from '../lib/modelIcons';
import { useSettingsState } from '../hooks/useSettingsState';
import { ProvidersSettingsPanel } from './ProvidersSettingsPanel';
import { BillingDashboard } from './BillingDashboard';
import { AgentHealthPanel } from './AgentHealthPanel';
import { Button } from './ui';
import { Sidebar } from './layout/Sidebar';
import { SettingsGeneralPanel } from './settings/SettingsGeneralPanel';
import { SettingsRoutingInlinePanel } from './settings/SettingsRoutingInlinePanel';
import { SettingsConnectorsPanel } from './settings/SettingsConnectorsPanel';
import { SettingsIconsInlinePanel } from './settings/SettingsIconsInlinePanel';

type Panel = 'general' | 'providers' | 'routing' | 'connectors' | 'icons' | 'billing' | 'health';

const NAV_ITEMS: { id: Panel; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'providers', label: 'AI Services' },
  { id: 'routing', label: 'AI Preferences' },
  { id: 'connectors', label: 'Connectors' },
  { id: 'icons', label: 'Appearance' },
  { id: 'billing', label: 'Billing' },
  { id: 'health', label: 'System Status' },
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
  isMobile?: boolean;
  onNavigateToLanding?: () => void;
  onOpenTasks?: (nav: string) => void;
  onOpenSearch?: () => void;
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
  isMobile,
  onNavigateToLanding,
  onOpenTasks,
  onOpenSearch,
}: SettingsPageProps) {
  const [panel, setPanel] = useState<Panel>('general');
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const settings = useSettingsState({ baseUrl, isSignedIn, getAuthToken, initialModelIconOverrides });
  const apiConfig = { baseUrl: baseUrl.trim(), getAuthToken, hasAuth: isSignedIn };

  /* ─── Handlers ─── */

  const handleTest = async () => {
    setStatus('checking'); setErrorMsg('');
    try {
      if (requiresAuth) { const token = getAuthToken ? await getAuthToken() : null; if (!token) throw new Error('Sign in to continue.'); }
      await checkHealth({ baseUrl: baseUrl.trim(), getAuthToken }); setStatus('ok');
    } catch (err) { setStatus('error'); setErrorMsg(err instanceof Error && err.message ? err.message : 'Couldn\'t connect to the server. Check the address and try again.'); }
  };

  const handleSave = async () => {
    if (!baseUrl.trim()) return;
    setSaving(true);
    try {
      await onSave(baseUrl.trim());
      if (onSaveModelIconOverrides) await onSaveModelIconOverrides(settings.iconOverrides);
      toastSuccess('Settings saved');
    } catch (err) { toastApiError(err, 'Couldn\'t save settings'); }
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
        isMobile={isMobile}
        onNavChange={(id) => {
          if (id === 'search') onOpenSearch?.();
          else if (id === 'computer' || id === 'new') onNavigateToLanding?.();
          else { onOpenTasks?.(id); }
        }}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-10">
          <button
            type="button"
            onClick={onBack}
            className="text-[13px] text-secondary hover:text-primary transition-colors duration-200 bg-transparent border-none cursor-pointer mb-2"
          >
            ← Back
          </button>
          <h1 className="text-[32px] font-medium text-primary tracking-tight mb-8">
            Settings
          </h1>

          <div className="flex gap-10">
            {/* Left nav */}
            <nav className="w-[160px] flex-shrink-0">
              <div className="flex flex-col gap-[2px]">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.id} type="button" onClick={() => setPanel(item.id)}
                    className={[
                      'text-left px-3 py-[7px] rounded-lg text-[13.5px] border-none cursor-pointer transition-colors duration-200',
                      panel === item.id ? 'bg-surface-hover font-medium text-primary' : 'bg-transparent text-secondary hover:text-primary hover:bg-surface-hover',
                    ].join(' ')}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </nav>

            {/* Right content */}
            <div className="flex-1 min-w-0">
              {panel === 'general' && (
                <SettingsGeneralPanel
                  baseUrl={baseUrl}
                  setBaseUrl={setBaseUrl}
                  status={status}
                  setStatus={setStatus}
                  errorMsg={errorMsg}
                  saving={saving}
                  isSignedIn={isSignedIn}
                  userLabel={userLabel}
                  clerkEnabled={clerkEnabled}
                  models={settings.models}
                  modelsStatus={settings.modelsStatus}
                  onSignIn={onSignIn}
                  onSignOut={onSignOut}
                  onBack={onBack}
                  handleTest={() => void handleTest()}
                  handleSave={() => void handleSave()}
                />
              )}

              {panel === 'providers' && (
                <ProvidersSettingsPanel
                  config={{ baseUrl: baseUrl.trim(), getAuthToken }}
                  isSignedIn={isSignedIn}
                />
              )}

              {panel === 'routing' && (
                <SettingsRoutingInlinePanel
                  isSignedIn={isSignedIn}
                  modelPreferences={settings.modelPreferences}
                  modelOptions={settings.modelOptions}
                  availableModelIds={settings.availableModelIds}
                  preferencesStatus={settings.preferencesStatus}
                  routingDirty={settings.routingDirty}
                  handleDefaultModelChange={settings.handleDefaultModelChange}
                  handleRoutingChange={settings.handleRoutingChange}
                  handleResetRouting={settings.handleResetRouting}
                  handleSaveRouting={settings.handleSaveRouting}
                />
              )}

              {panel === 'connectors' && (
                <SettingsConnectorsPanel
                  isSignedIn={isSignedIn}
                  providerCards={settings.providerCards}
                  connectorsLoading={settings.connectorsLoading}
                  connectorBusyProvider={settings.connectorBusyProvider}
                  connectorBusyId={settings.connectorBusyId}
                  handleConnectProvider={settings.handleConnectProvider}
                  handleValidateConnector={settings.handleValidateConnector}
                  handleDisconnectConnector={settings.handleDisconnectConnector}
                />
              )}

              {panel === 'icons' && (
                <SettingsIconsInlinePanel
                  sortedModels={settings.sortedModels}
                  modelsStatus={settings.modelsStatus}
                  iconOverrides={settings.iconOverrides}
                  saving={saving}
                  handleIconSelection={settings.handleIconSelection}
                  handleSave={() => void handleSave()}
                />
              )}

              {panel === 'billing' && (
                <div className="space-y-8"><section>
                  <h2 className="text-[15px] font-medium text-primary mb-1">Billing</h2>
                  <p className="text-[13px] text-secondary mb-5">Usage credits and transaction history.</p>
                  <div className="rounded-lg border border-border-light bg-surface p-4">
                    <BillingDashboard config={apiConfig} />
                  </div>
                </section></div>
              )}

              {panel === 'health' && (
                <div className="space-y-8"><section>
                  <h2 className="text-[15px] font-medium text-primary mb-1">System Status</h2>
                  <p className="text-[13px] text-secondary mb-5">Check whether your AI services are running and responding.</p>
                  <div className="rounded-lg border border-border-light bg-surface p-4">
                    <AgentHealthPanel config={apiConfig} />
                  </div>
                </section></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
