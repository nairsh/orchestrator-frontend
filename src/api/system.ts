import type { AgentHealthStatus } from './types';
import type { ApiConfig } from './core';
import { request } from './core';

export async function listTeams(config: ApiConfig): Promise<{ teams: Array<Record<string, unknown>> }> {
  return request<{ teams: Array<Record<string, unknown>> }>(config, '/v1/teams');
}

export async function getWorkspace(
  config: ApiConfig,
  chatId: string
): Promise<{
  workspace: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  files: string[];
  created_files?: string[];
}> {
  return request<{
    workspace: Record<string, unknown>;
    metadata: Record<string, unknown> | null;
    files: string[];
    created_files?: string[];
  }>(
    config,
    `/v1/sandbox/workspaces/${encodeURIComponent(chatId)}`
  );
}

export async function getAgentHealth(config: ApiConfig): Promise<{ agents: AgentHealthStatus[]; summary: Record<string, number>; timestamp: string }> {
  return request<{ agents: AgentHealthStatus[]; summary: Record<string, number>; timestamp: string }>(config, '/v1/health/agents');
}

export async function getSystemHealth(config: ApiConfig): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>(config, '/v1/health/system');
}

export async function checkHealth(config: ApiConfig): Promise<{ status: string }> {
  return request<{ status: string }>(config, '/health');
}
