import type { ConnectorProviderInfo, ConnectorRecord } from './types';
import type { ApiConfig } from './core';
import { request } from './core';

export async function listConnectorProviders(config: ApiConfig): Promise<{ providers: ConnectorProviderInfo[] }> {
  return request<{ providers: ConnectorProviderInfo[] }>(config, '/v1/connectors/providers');
}

export async function listConnectors(config: ApiConfig): Promise<{ connectors: ConnectorRecord[] }> {
  return request<{ connectors: ConnectorRecord[] }>(config, '/v1/connectors');
}

export async function startConnectorOAuth(
  config: ApiConfig,
  provider: ConnectorProviderInfo['provider'],
  input: { redirect_uri?: string; frontend_origin?: string; scopes?: string[] } = {}
): Promise<{ state: string; authorize_url: string; expires_at: string; redirect_uri: string }> {
  return request(config, `/v1/connectors/${provider}/start`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function validateConnector(config: ApiConfig, connectorId: string): Promise<{ connector: ConnectorRecord }> {
  return request<{ connector: ConnectorRecord }>(config, `/v1/connectors/${encodeURIComponent(connectorId)}/validate`, {
    method: 'POST',
  });
}

export async function disconnectConnector(config: ApiConfig, connectorId: string): Promise<{ disconnected: boolean; id: string }> {
  return request<{ disconnected: boolean; id: string }>(config, `/v1/connectors/${encodeURIComponent(connectorId)}`, {
    method: 'DELETE',
  });
}
