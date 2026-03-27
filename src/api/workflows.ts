import type {
  CreateWorkflowResponse,
  WorkflowSummary,
  WorkflowTraceStep,
  ApprovalRequest,
  WorkflowProgress,
  TaskSummary,
} from './types';
import type { ApiConfig } from './core';
import { request } from './core';

export interface WorkflowDetails {
  workflow: WorkflowSummary;
  tasks: TaskSummary[];
}

export interface ContextFileUpload {
  filename: string;
  content_base64: string;
  media_type: string;
}

export interface CreateWorkflowInput {
  objective: string;
  orchestrator_model?: string;
  chat_id?: string;
  model_overrides?: Record<string, string>;
  working_directory?: string;
  tools?: string[];
  max_credits?: number;
  callback_url?: string;
  human_approval?: boolean;
  context_files?: ContextFileUpload[];
  background?: boolean;
}

export async function createWorkflow(
  config: ApiConfig,
  input: CreateWorkflowInput
): Promise<CreateWorkflowResponse> {
  return request<CreateWorkflowResponse>(config, '/v1/workflows', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function listWorkflows(
  config: ApiConfig,
  params?: { status?: string; page?: number; limit?: number }
): Promise<{ workflows: WorkflowSummary[]; total: number; page: number; limit: number }> {
  const sp = new URLSearchParams();
  if (params?.status) sp.set('status', params.status);
  if (typeof params?.page === 'number') sp.set('page', String(params.page));
  if (typeof params?.limit === 'number') sp.set('limit', String(params.limit));
  const qs = sp.toString();
  return request<{ workflows: WorkflowSummary[]; total: number; page: number; limit: number }>(
    config,
    `/v1/workflows${qs ? `?${qs}` : ''}`
  );
}

export async function cancelWorkflow(
  config: ApiConfig,
  workflowId: string
): Promise<{ status?: string; workflow_id?: string }> {
  return request<{ status?: string; workflow_id?: string }>(config, `/v1/workflows/${workflowId}`, {
    method: 'DELETE',
  });
}

export async function getWorkflow(config: ApiConfig, workflowId: string): Promise<WorkflowDetails> {
  return request<WorkflowDetails>(config, `/v1/workflows/${workflowId}`);
}

export async function getWorkflowTrace(
  config: ApiConfig,
  workflowId: string
): Promise<{ workflow_id: string; trace: WorkflowTraceStep[] }> {
  return request<{ workflow_id: string; trace: WorkflowTraceStep[] }>(config, `/v1/workflows/${workflowId}/trace`);
}

export async function continueWorkflow(
  config: ApiConfig,
  workflowId: string,
  objective: string
): Promise<{ workflow_id: string; status: string }> {
  return request<{ workflow_id: string; status: string }>(config, `/v1/workflows/${workflowId}/continue`, {
    method: 'POST',
    body: JSON.stringify({ objective }),
  });
}

export async function retryWorkflow(
  config: ApiConfig,
  workflowId: string
): Promise<{ workflow_id: string; status: string; reset_tasks: number }> {
  return request<{ workflow_id: string; status: string; reset_tasks: number }>(
    config,
    `/v1/workflows/${workflowId}/retry`,
    { method: 'POST' }
  );
}

export async function pauseWorkflow(
  config: ApiConfig,
  workflowId: string
): Promise<{ workflow_id: string; status: string }> {
  return request<{ workflow_id: string; status: string }>(config, `/v1/workflows/${workflowId}/pause`, {
    method: 'POST',
  });
}

export async function approveWorkflowTask(
  config: ApiConfig,
  workflowId: string,
  taskId: string,
  approved: boolean
): Promise<{ workflow_id: string; task_id: string; action: string }> {
  return request<{ workflow_id: string; task_id: string; action: string }>(
    config,
    `/v1/workflows/${workflowId}/approve`,
    { method: 'POST', body: JSON.stringify({ task_id: taskId, approved }) }
  );
}

export async function getPendingApprovals(
  config: ApiConfig,
  workflowId: string
): Promise<{ approvals: ApprovalRequest[] }> {
  return request<{ approvals: ApprovalRequest[] }>(config, `/v1/workflows/${workflowId}/approve/pending`);
}

export async function getWorkflowProgress(
  config: ApiConfig,
  workflowId: string
): Promise<WorkflowProgress> {
  return request<WorkflowProgress>(config, `/v1/workflows/${workflowId}/progress`);
}
