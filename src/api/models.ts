import type { ModelsResponse, ModelPreferences } from './types';
import type { ApiConfig } from './core';
import { request } from './core';

// Deduplicate concurrent getModels requests and cache briefly (30s)
const modelsCache = new Map<string, { data: ModelsResponse; timestamp: number }>();
const pendingModelsRequests = new Map<string, Promise<ModelsResponse>>();
const MODELS_CACHE_TTL_MS = 30_000;

export async function getModels(config: ApiConfig): Promise<ModelsResponse> {
  // Include auth in cache key so sign-in/out doesn't serve stale user-specific data
  const key = `${config.baseUrl}|${config.hasAuth ? 'auth' : 'anon'}`;

  // Return cached data if fresh
  const cached = modelsCache.get(key);
  if (cached && Date.now() - cached.timestamp < MODELS_CACHE_TTL_MS) {
    return cached.data;
  }

  // Deduplicate in-flight requests
  const pending = pendingModelsRequests.get(key);
  if (pending) return pending;

  const promise = request<ModelsResponse>(config, '/v1/models')
    .then((data) => {
      modelsCache.set(key, { data, timestamp: Date.now() });
      return data;
    })
    .finally(() => {
      pendingModelsRequests.delete(key);
    });

  pendingModelsRequests.set(key, promise);
  return promise;
}

/** Invalidate the models cache (e.g. after saving preferences) */
export function invalidateModelsCache(config?: ApiConfig) {
  if (config) {
    const key = `${config.baseUrl}|${config.hasAuth ? 'auth' : 'anon'}`;
    modelsCache.delete(key);
  } else {
    modelsCache.clear();
  }
}

export async function getModelPreferences(config: ApiConfig): Promise<ModelPreferences> {
  return request<ModelPreferences>(config, '/v1/models/preferences');
}

export async function saveModelPreferences(
  config: ApiConfig,
  input: Partial<Pick<ModelPreferences, 'default_orchestrator_model' | 'orchestrator_models' | 'agent_models' | 'subagent_models'>>
): Promise<ModelPreferences> {
  return request<ModelPreferences>(config, '/v1/models/preferences', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function resetModelPreferences(config: ApiConfig): Promise<ModelPreferences> {
  return request<ModelPreferences>(config, '/v1/models/preferences', {
    method: 'DELETE',
  });
}

export async function getPresets(config: ApiConfig): Promise<{ presets: Record<string, unknown> }> {
  return request<{ presets: Record<string, unknown> }>(config, '/v1/presets');
}
