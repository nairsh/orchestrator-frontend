import type { ConnectorProvider, ConnectorProviderInfo, ConnectorRecord } from '../api/types';
import { Tag, Tooltip } from '@lobehub/ui';
import { Button } from './ui/Button';
import { RefreshCcw } from 'lucide-react';

const CONNECTOR_COPY: Record<
  ConnectorProvider,
  { label: string; eyebrow: string; description: string; accent: string }
> = {
  github: {
    label: 'GitHub',
    eyebrow: 'Repos, orgs, code context',
    description: 'Connect repos and organizations so your AI can access active code and project metadata.',
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
    description: 'Pull structured workspace knowledge into your AI context and scheduled tasks.',
    accent: 'from-[#f3eadb] to-[#faf5ec]',
  },
};

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
    return [login, organizations ? `${organizations} orgs` : null, repositories ? `${repositories} repos` : null].filter(Boolean).join(' • ');
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

const getStatusTagColor = (status: string): string => {
  if (status === 'connected') return 'green';
  if (status === 'error') return 'red';
  if (status === 'pending') return 'gold';
  return 'default';
};

interface SettingsConnectorsPanelProps {
  isSignedIn: boolean;
  connectorsLoading: boolean;
  connectorBusyProvider: ConnectorProvider | null;
  connectorBusyId: string | null;
  providerCards: Array<{ provider: ConnectorProviderInfo; connector: ConnectorRecord | null }>;
  onRefresh: () => void;
  onConnect: (provider: ConnectorProvider) => void;
  onValidate: (connectorId: string) => void;
  onDisconnect: (connectorId: string) => void;
}

export function SettingsConnectorsPanel({
  isSignedIn, connectorsLoading, connectorBusyProvider, connectorBusyId,
  providerCards, onRefresh, onConnect, onValidate, onDisconnect,
}: SettingsConnectorsPanelProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-border-light bg-surface p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted">Connected services</div>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-primary">Connect your tools and services.</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">
              Sign in to GitHub, Notion, Linear, and more so your AI can access the context it needs to do great work.
            </p>
          </div>
          <Button variant="ghost" onClick={onRefresh} disabled={!isSignedIn || connectorsLoading}>
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
                <div key={provider.provider} className={`rounded-[24px] border border-border-light bg-gradient-to-br ${copy.accent} p-[1px] shadow-sm`}>
                  <div className="h-full rounded-[23px] bg-surface/95 p-5 backdrop-blur">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-muted">{copy.eyebrow}</div>
                        <div className="mt-2 text-xl font-semibold tracking-tight text-primary">{copy.label}</div>
                      </div>
                      <Tag size="small" color={getStatusTagColor(connector?.status ?? (provider.configured ? 'disconnected' : 'error'))}>
                        {provider.configured ? connector?.status ?? 'ready' : 'not configured'}
                      </Tag>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-secondary">{copy.description}</p>

                    <div className="mt-4 rounded-2xl border border-border-light bg-surface-secondary px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.16em] text-muted">Scopes</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {provider.scopes.length > 0 ? (
                          provider.scopes.map((scope) => (
                            <Tag key={scope} size="small">{scope}</Tag>
                          ))
                        ) : (
                          <span className="text-xs text-muted">Set when you connect</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 min-h-[56px] text-sm text-secondary">
                      {connector ? (
                        <>
                          <div className="font-medium text-primary">{connector.display_name}</div>
                          <div className="mt-1 text-xs text-muted">{getConnectorSummary(connector) || 'Connected.'}</div>
                        </>
                      ) : provider.configured ? (
                        <div className="text-sm text-muted">No account connected yet.</div>
                      ) : (
                        <div className="text-sm text-warning">This connector requires server-side setup before it can be used.</div>
                      )}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button variant="primary" onClick={() => onConnect(provider.provider)} disabled={!provider.configured || busy} className="rounded-2xl">
                        {busy && connectorBusyProvider === provider.provider ? 'Opening...' : connector ? 'Reconnect' : 'Connect'}
                      </Button>
                      {connector && (
                        <>
                          <Button variant="secondary" onClick={() => onValidate(connector.id)} disabled={busy} className="rounded-2xl">Validate</Button>
                          <Button variant="ghost" onClick={() => onDisconnect(connector.id)} disabled={busy} className="rounded-2xl">Disconnect</Button>
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
  );
}
