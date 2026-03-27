import type { Memory } from './types';
import type { ApiConfig } from './core';
import { request } from './core';

export async function listMemories(
  config: ApiConfig,
  params?: { category?: string; query?: string }
): Promise<{ memories: Memory[] }> {
  const sp = new URLSearchParams();
  if (params?.category) sp.set('category', params.category);
  if (params?.query) sp.set('query', params.query);
  const qs = sp.toString();
  return request<{ memories: Memory[] }>(config, `/v1/memory${qs ? `?${qs}` : ''}`);
}

export async function saveMemory(
  config: ApiConfig,
  input: { key: string; content: string; category?: string }
): Promise<Memory> {
  return request<Memory>(config, '/v1/memory', { method: 'POST', body: JSON.stringify(input) });
}

export async function deleteMemory(config: ApiConfig, id: string): Promise<{ deleted: boolean } | { error: string }> {
  return request(config, `/v1/memory/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
