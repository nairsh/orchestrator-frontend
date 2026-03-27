import { Loader2 } from 'lucide-react';
import type { ConnectorProvider, ConnectorProviderInfo, ConnectorRecord } from '../../api/types';
import { Button } from '../ui';
import { IconGitHub, IconLinear, IconNotion } from '../icons/CustomIcons';

const CONNECTOR_COPY: Record<
  ConnectorProvider,
  { label: string; description: string; icon: React.ReactNode }
> = {
  github: {
    label: 'GitHub',
    description: 'Connect your repos and organizations.',
    icon: <IconGitHub size={20} />,
  },
  linear: {
    label: 'Linear',
    description: 'Bring issues, cycles, and team data into tasks.',
    icon: <IconLinear size={20} />,
  },
  notion: {
    label: 'Notion',
    description: 'Pull workspace docs and pages into your tasks.',
    icon: <IconNotion size={20} />,
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

export interface SettingsConnectorsPanelProps {
  isSignedIn: boolean;
  providerCards: { provider: ConnectorProviderInfo; connector: ConnectorRecord | null }[];
  connectorsLoading: boolean;
  connectorBusyProvider: ConnectorProvider | null;
  connectorBusyId: string | null;
  handleConnectProvider: (provider: ConnectorProvider) => Promise<void>;
  handleValidateConnector: (connectorId: string) => Promise<void>;
  handleDisconnectConnector: (connectorId: string) => Promise<void>;
}

export function SettingsConnectorsPanel({
  isSignedIn,
  providerCards,
  connectorsLoading,
  connectorBusyProvider,
  connectorBusyId,
  handleConnectProvider,
  handleValidateConnector,
  handleDisconnectConnector,
}: SettingsConnectorsPanelProps) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-[15px] font-medium text-primary mb-1">Connectors</h2>
        <p className="text-[13px] text-secondary mb-5">Connect GitHub, Linear, Notion, and more.</p>

        {!isSignedIn && (
          <div className="rounded-lg border border-border-light bg-surface-secondary px-4 py-3 text-[13px] text-secondary">
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
                  className="flex items-center justify-between gap-4 rounded-lg border border-border-light bg-surface px-4 py-3.5"
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
                        <Button variant="ghost" size="sm" onClick={() => void handleValidateConnector(connector.id)} disabled={busy}>
                          Test connection
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => void handleDisconnectConnector(connector.id)} disabled={busy}>
                          Disconnect
                        </Button>
                      </>
                    )}
                    <Button
                      variant={connected ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => void handleConnectProvider(provider.provider)}
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
  );
}
