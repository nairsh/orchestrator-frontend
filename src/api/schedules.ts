import type { ScheduledWorkflow } from './types';
import type { ApiConfig } from './core';
import { request } from './core';

export async function listSchedules(config: ApiConfig): Promise<{ schedules: ScheduledWorkflow[] }> {
  return request<{ schedules: ScheduledWorkflow[] }>(config, '/v1/schedules');
}

export interface CreateScheduleInput {
  objective: string;
  schedule_type?: 'cron' | 'interval';
  cron_expression?: string;
  interval_value?: number;
  interval_unit?: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  timezone?: string;
  overlap_policy?: 'skip' | 'queue';
  start_at?: string;
  end_at?: string;
  chat_id?: string;
  orchestrator_model?: string;
  model_overrides?: Record<string, string>;
  working_directory?: string;
  human_approval?: boolean;
  max_credits?: number;
  tools?: string[];
}

export async function createSchedule(
  config: ApiConfig,
  input: CreateScheduleInput
): Promise<{ id: string; cron_expression: string | null; next_run_at: string; status: string }> {
  return request<{ id: string; cron_expression: string | null; next_run_at: string; status: string }>(config, '/v1/schedules', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateSchedule(
  config: ApiConfig,
  id: string,
  patch: {
    status?: 'active' | 'paused';
    cron_expression?: string;
    interval_value?: number;
    interval_unit?: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
    timezone?: string;
    overlap_policy?: 'skip' | 'queue';
    start_at?: string | null;
    end_at?: string | null;
  }
): Promise<{ success: true } | { success: boolean }> {
  return request(config, `/v1/schedules/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function deleteSchedule(config: ApiConfig, id: string): Promise<{ success: true } | { success: boolean }> {
  return request(config, `/v1/schedules/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function triggerSchedule(
  config: ApiConfig,
  id: string
): Promise<{ workflow_id: string; status: string }> {
  return request<{ workflow_id: string; status: string }>(config, `/v1/schedules/${encodeURIComponent(id)}/trigger`, {
    method: 'POST',
  });
}
