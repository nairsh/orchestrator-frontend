import type { WorkflowTemplate } from './types';
import type { ApiConfig } from './core';
import { request } from './core';
import type { CreateWorkflowInput } from './workflows';

export async function listTemplates(
  config: ApiConfig,
  params?: { tag?: string; search?: string }
): Promise<{ templates: WorkflowTemplate[] }> {
  const sp = new URLSearchParams();
  if (params?.tag) sp.set('tag', params.tag);
  if (params?.search) sp.set('search', params.search);
  const qs = sp.toString();
  return request<{ templates: WorkflowTemplate[] }>(config, `/v1/templates${qs ? `?${qs}` : ''}`);
}

export async function useTemplate(
  config: ApiConfig,
  templateId: string,
  objective: string
): Promise<{ template_id: string; config: CreateWorkflowInput }> {
  return request<{ template_id: string; config: CreateWorkflowInput }>(config, `/v1/templates/${templateId}/use`, {
    method: 'POST',
    body: JSON.stringify({ objective }),
  });
}

export async function createTemplate(
  config: ApiConfig,
  input: { name: string; description: string; config: Record<string, unknown>; tags?: string[]; is_public?: boolean }
): Promise<{ template: WorkflowTemplate }> {
  return request<{ template: WorkflowTemplate }>(config, '/v1/templates', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function deleteTemplate(
  config: ApiConfig,
  id: string
): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(config, `/v1/templates/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
