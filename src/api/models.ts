import type { ModelsResponse, ModelPreferences } from './types';
import type { ApiConfig } from './core';
import { request } from './core';

export async function getModels(config: ApiConfig): Promise<ModelsResponse> {
  return request<ModelsResponse>(config, '/v1/models');
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
