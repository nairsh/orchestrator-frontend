import { Loader2, RefreshCcw } from 'lucide-react';
import type { ApiConfig } from '../../api/client';
import { disconnectConnector, startConnectorOAuth, validateConnector } from '../../api/client';
import type { ConnectorProvider, ConnectorProviderInfo, ConnectorRecord } from '../../api/types';
import { toastApiError, toastInfo, toastSuccess } from '../../lib/toast';
import { Button } from '../ui';
import { providerCopy, getConnectorSummary } from './connectorsHelpers';

interface ConnectorsTabProps {
  connectorCards: Array<{ provider: ConnectorProviderInfo; connector: ConnectorRecord | null }>;
  connectorsLoading: boolean;
  connectorBusyId: string | null;
  connectorBusyProvider: ConnectorProvider | null;
  setConnectorBusyId: (id: string | null) => void;
  setConnectorBusyProvider: (provider: ConnectorProvider | null) => void;
  onRefresh: () => Promise<void>;
  config: ApiConfig;
}

export function ConnectorsTab({
  connectorCards, connectorsLoading, connectorBusyId, connectorBusyProvider,
  setConnectorBusyId, setConnectorBusyProvider, onRefresh, config,
}: ConnectorsTabProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-secondary">{connectorCards.length} connector providers available</div>
        <Button variant="secondary" onClick={() => void onRefresh()}>
          {connectorsLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {connectorCards.map(({ provider, connector }) => {
          const copy = providerCopy[provider.provider];
          const Icon = copy.icon;
          const busy = connectorBusyProvider === provider.provider || connectorBusyId === connector?.id;
          return (
            <div key={provider.provider} className="rounded-xl border border-border-light bg-surface p-5 hover:border-border hover:shadow-xs transition-all duration-150">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border-light bg-surface-secondary flex-shrink-0">
                  <Icon size={22} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-primary">{copy.title}</span>
                    {connector && (
                      <svg className="w-5 h-5 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  {connector ? (
                    <div className="mt-0.5 text-xs text-muted">{getConnectorSummary(connector) || connector.display_name}</div>
                  ) : (
                    <div className="mt-0.5 text-sm text-muted line-clamp-2">{copy.description}</div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" disabled={!provider.configured || busy} onClick={async () => {
                  setConnectorBusyProvider(provider.provider);
                  try {
                    const { authorize_url } = await startConnectorOAuth(config, provider.provider, { frontend_origin: window.location.origin });
                    window.open(authorize_url, '_blank', 'noopener,noreferrer,width=620,height=760');
                    toastInfo(`${copy.title} authorization opened`, 'Complete provider auth, then refresh or validate.');
                  } catch (err) { toastApiError(err, `Failed to start ${copy.title} connection`); }
                  finally { setConnectorBusyProvider(null); }
                }}>
                  {busy && connectorBusyProvider === provider.provider ? 'Opening...' : connector ? 'Reconnect' : 'Connect'}
                </Button>

                {connector && (
                  <>
                    <Button variant="secondary" size="sm" disabled={busy} onClick={async () => {
                      setConnectorBusyId(connector.id);
                      try { await validateConnector(config, connector.id); toastSuccess('Connector validated'); await onRefresh(); }
                      catch (err) { toastApiError(err, 'Failed to validate connector'); }
                      finally { setConnectorBusyId(null); }
                    }}>Validate</Button>
                    <Button variant="ghost" size="sm" disabled={busy} onClick={async () => {
                      setConnectorBusyId(connector.id);
                      try { await disconnectConnector(config, connector.id); toastSuccess('Connector disconnected'); await onRefresh(); }
                      catch (err) { toastApiError(err, 'Failed to disconnect connector'); }
                      finally { setConnectorBusyId(null); }
                    }}>Disconnect</Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
