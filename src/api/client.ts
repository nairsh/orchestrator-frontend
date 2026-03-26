import type {
  ConnectorProviderInfo,
  ConnectorRecord,
  BillingBalanceResponse,
  BillingUsageEntry,
  BillingTransaction,
  CreateWorkflowResponse,
  KnowledgeChunk,
  KnowledgeDocument,
  KnowledgeSearchMatch,
  ModelPreferences,
  ModelsResponse,
  SkillRecord,
  Memory,
  ScheduledWorkflow,
  WorkflowTemplate,
  AgentHealthStatus,
  ApprovalRequest,
  WorkflowProgress,
  TaskSummary,
  WorkflowSummary,
  WorkflowTraceStep,
} from './types';

export interface ApiConfig {
  baseUrl: string;
  getAuthToken?: () => Promise<string | null>;
  hasAuth?: boolean;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly meta?: {
      type?: string;
      code?: string;
      param?: string;
      retry_after?: number;
    }
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function normalizeApiErrorMessage(message: string): string {
  const lowered = message.toLowerCase();
  if (
    lowered.includes('invalid api key') ||
    lowered.includes('invalid or missing api key') ||
    lowered.includes('invalid or expired clerk token') ||
    lowered.includes('invalid auth token') ||
    lowered.includes('missing authentication token')
  ) {
    return 'Sign in with Clerk to continue.';
  }
  return message;
}

async function request<T>(config: ApiConfig, path: string, init?: RequestInit): Promise<T> {
  const url = `${config.baseUrl.replace(/\/$/, '')}${path}`;

  const headers = new Headers(init?.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  // Only set Content-Type for JSON bodies.
  if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = await resolveAuthToken(config);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    let meta: ApiError['meta'] | undefined;
    try {
      const body = (await response.json()) as {
        error?: { type?: string; message?: string; code?: string; param?: string; retry_after?: number };
      };
      message = body.error?.message ?? message;
      meta = body.error;
    } catch {
      // ignore parse failure
    }
    throw new ApiError(response.status, normalizeApiErrorMessage(message), meta);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }

  return (await response.text()) as unknown as T;
}

async function resolveAuthToken(config: ApiConfig): Promise<string | null> {
  const clerkToken = config.getAuthToken ? await config.getAuthToken() : null;
  if (clerkToken && clerkToken.trim().length > 0) {
    return clerkToken.trim();
  }
  return null;
}

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

export async function listSkills(config: ApiConfig): Promise<{ skills: SkillRecord[] }> {
  return request<{ skills: SkillRecord[] }>(config, '/v1/skills');
}

export async function getSkill(config: ApiConfig, id: string): Promise<{ skill: SkillRecord }> {
  return request<{ skill: SkillRecord }>(config, `/v1/skills/${encodeURIComponent(id)}`);
}

export async function upsertSkill(
  config: ApiConfig,
  id: string,
  input: { name?: string; description: string; prompt_addendum: string; tools?: string[] }
): Promise<{ skill: SkillRecord }> {
  return request<{ skill: SkillRecord }>(config, `/v1/skills/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function removeSkill(config: ApiConfig, id: string): Promise<{ deleted: boolean; id?: string }> {
  return request<{ deleted: boolean; id?: string }>(config, `/v1/skills/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function importSkill(
  config: ApiConfig,
  input: { skill_id: string; markdown: string }
): Promise<{ skill: SkillRecord }> {
  return request<{ skill: SkillRecord }>(config, '/v1/skills/import', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getBillingBalance(config: ApiConfig): Promise<BillingBalanceResponse> {
  return request<BillingBalanceResponse>(config, '/v1/billing/balance');
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

export async function listTeams(config: ApiConfig): Promise<{ teams: Array<Record<string, unknown>> }> {
  return request<{ teams: Array<Record<string, unknown>> }>(config, '/v1/teams');
}

export async function listKnowledgeDocuments(config: ApiConfig): Promise<{ documents: KnowledgeDocument[] }> {
  return request<{ documents: KnowledgeDocument[] }>(config, '/v1/knowledge/documents');
}

export async function uploadKnowledgeDocument(
  config: ApiConfig,
  input: { filename: string; media_type: string; content_base64: string }
): Promise<{ document: KnowledgeDocument }> {
  return request<{ document: KnowledgeDocument }>(config, '/v1/knowledge/documents', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getKnowledgeDocument(
  config: ApiConfig,
  documentId: string
): Promise<{ document: KnowledgeDocument; chunks: KnowledgeChunk[]; content: string }> {
  return request<{ document: KnowledgeDocument; chunks: KnowledgeChunk[]; content: string }>(
    config,
    `/v1/knowledge/documents/${encodeURIComponent(documentId)}`
  );
}

export async function deleteKnowledgeDocument(
  config: ApiConfig,
  documentId: string
): Promise<{ deleted: boolean; id: string }> {
  return request<{ deleted: boolean; id: string }>(config, `/v1/knowledge/documents/${encodeURIComponent(documentId)}`, {
    method: 'DELETE',
  });
}

export async function searchKnowledge(
  config: ApiConfig,
  input: { query: string; limit?: number }
): Promise<{ matches: KnowledgeSearchMatch[] }> {
  return request<{ matches: KnowledgeSearchMatch[] }>(config, '/v1/knowledge/search', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

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

export async function getAgentHealth(config: ApiConfig): Promise<{ agents: AgentHealthStatus[]; summary: Record<string, number>; timestamp: string }> {
  return request<{ agents: AgentHealthStatus[]; summary: Record<string, number>; timestamp: string }>(config, '/v1/health/agents');
}

export async function getSystemHealth(config: ApiConfig): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>(config, '/v1/health/system');
}

export async function checkHealth(config: ApiConfig): Promise<{ status: string }> {
  return request<{ status: string }>(config, '/health');
}

// ─── Workflow Controls ───

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

// ─── Billing ───

export async function getBillingUsage(
  config: ApiConfig,
  params?: { period?: string; group_by?: string }
): Promise<{ usage: BillingUsageEntry[]; period: string }> {
  const sp = new URLSearchParams();
  if (params?.period) sp.set('period', params.period);
  if (params?.group_by) sp.set('group_by', params.group_by);
  const qs = sp.toString();
  return request<{ usage: BillingUsageEntry[]; period: string }>(config, `/v1/billing/usage${qs ? `?${qs}` : ''}`);
}

export async function getBillingTransactions(
  config: ApiConfig,
  params?: { page?: number; limit?: number }
): Promise<{ transactions: BillingTransaction[]; total: number }> {
  const sp = new URLSearchParams();
  if (typeof params?.page === 'number') sp.set('page', String(params.page));
  if (typeof params?.limit === 'number') sp.set('limit', String(params.limit));
  const qs = sp.toString();
  return request<{ transactions: BillingTransaction[]; total: number }>(config, `/v1/billing/transactions${qs ? `?${qs}` : ''}`);
}

export async function topUpCredits(
  config: ApiConfig,
  amount: number
): Promise<{ credits_balance: number }> {
  return request<{ credits_balance: number }>(config, '/v1/billing/top-up', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

// ─── Schedule Trigger ───

export async function triggerSchedule(
  config: ApiConfig,
  id: string
): Promise<{ workflow_id: string; status: string }> {
  return request<{ workflow_id: string; status: string }>(config, `/v1/schedules/${encodeURIComponent(id)}/trigger`, {
    method: 'POST',
  });
}

// ─── Templates CRUD ───

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
