import type { ApiProvider, ProviderPreset, CreateProviderInput, UpdateProviderInput } from './types';
import type { ApiConfig } from './core';
import { request } from './core';

export async function listProviders(config: ApiConfig): Promise<ApiProvider[]> {
  const res = await request<{ providers: ApiProvider[] }>(config, '/v1/providers');
  return res.providers;
}

export async function getProviderPresets(config: ApiConfig): Promise<Record<string, ProviderPreset>> {
  const res = await request<{ presets: Record<string, ProviderPreset> }>(config, '/v1/providers/presets');
  return res.presets;
}

export async function createProvider(config: ApiConfig, input: CreateProviderInput): Promise<ApiProvider> {
  return request<ApiProvider>(config, '/v1/providers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateProvider(config: ApiConfig, id: string, input: UpdateProviderInput): Promise<ApiProvider> {
  return request<ApiProvider>(config, `/v1/providers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteProvider(config: ApiConfig, id: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(config, `/v1/providers/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
