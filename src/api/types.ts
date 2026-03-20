export type WorkflowEventType =
  | 'planning_complete'
  | 'tasks_initialized'
  | 'orchestrator_thinking'
  | 'tool_call'
  | 'tool_result'
  | 'task_started'
  | 'task_dispatched'
  | 'task_completed'
  | 'task_failed'
  | 'task_added'
  | 'task_reused'
  | 'task_skipped'
  | 'human_approval_required'
  | 'workflow_completed'
  | 'workflow_failed'
  | 'credit_update'
  | 'subagent_tool_call'
  | 'subagent_tool_result'
  | 'bash_approval_requested';

export interface WorkflowEvent {
  type: WorkflowEventType;
  workflow_id: string;
  task_id?: string;
  data: unknown;
  timestamp: string;
}

export type WorkflowStepType =
  | 'orchestrator_message'
  | 'tool_call'
  | 'tool_result'
  | 'subagent_spawn'
  | 'subagent_message'
  | 'subagent_tool_call'
  | 'subagent_tool_result'
  | 'system_event';

export interface WorkflowTraceStep {
  step_id: string;
  workflow_id: string;
  timestamp: string;
  step_type: WorkflowStepType;
  model_name: string | null;
  message_content: string | null;
  tool_name: string | null;
  tool_input: unknown;
  tool_output: unknown;
  subagent_id: string | null;
}

export type AgentType = 'research' | 'analyze' | 'write' | 'code' | 'file';

export type TaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'cancelled'
  | 'skipped';

export type WorkflowStatus =
  | 'pending'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

export interface WorkflowSummary {
  id: string;
  objective: string;
  user_prompt?: string;
  orchestrator_model?: string | null;
  status: WorkflowStatus | string;
  error?: string | null;
  credits_consumed: number;
  started_at?: string | null;
  ended_at?: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  output?: string | null;
}

export interface TaskSummary {
  task_id: string;
  description: string;
  agent_type: string;
  depends_on: string[];
  status: string;
  output?: string;
  created_at: string;
  completed_at?: string | null;
}

export interface TaskStartedData {
  type?: 'heartbeat';
  description: string;
  display_description?: string;
  agent_type?: string;
  task_type?: string;
  origin?: string;
  output_artifact?: string;
  model?: string;
  run_id?: string;
  timeout_s?: number;
  elapsed_s?: number;
}

export interface TaskAddedData {
  description: string;
  display_description?: string;
  agent_type: string;
  depends_on?: string[];
  origin?: string;
  output_artifact?: string;
}

export interface ToolEventData {
  tool_name: string;
  tool_input?: unknown;
  tool_output?: unknown;
}

export interface TasksInitializedData {
  tasks: WorkflowTask[];
}

export interface WorkflowCompletedData {
  output?: string;
  total_credits?: number;
}

export interface WorkflowFailedData {
  error?: string;
}

export interface CreateWorkflowResponse {
  workflow_id: string;
  status: string;
  created_at: string;
  task_count: number;
  tasks: Array<{
    id: string;
    type?: string;
    description: string;
    agent_type: string;
    depends_on: string[];
  }>;
}

export interface ModelInfo {
  id: string;
  provider: string;
  display_name: string;
  capabilities: string[];
  cost_per_1m_input: number;
  cost_per_1m_output: number;
  context_window: number;
  max_output_tokens: number;
}

export interface ModelsResponse {
  models: ModelInfo[];
  orchestrator_models: string[];
  default_orchestrator_model: string;
  subagent_models: Record<string, string>;
}

export interface SkillRecord {
  id: string;
  name: string;
  description: string;
  prompt_addendum: string;
  tools: string[];
}

export interface BillingBalanceResponse {
  credits_balance: number;
  tier: string;
  usage_this_period: {
    credits_used: number;
    request_count: number;
  };
}

export interface StreamChunk {
  type: 'text_delta' | 'reasoning_delta' | 'usage' | 'tool_use' | 'search_results' | 'done' | 'error';
  text?: string;
  data?: unknown;
}

export interface Memory {
  id: string;
  user_id: string;
  category: string;
  key: string;
  content: string;
  relevance_score: number;
  access_count: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  config: Record<string, unknown>;
  created_by: string;
  is_public: boolean;
  tags: string[];
  created_at: string;
  usage_count: number;
}

export interface ScheduledWorkflow {
  id: string;
  user_id: string;
  cron_expression: string;
  workflow_config: string;
  status: 'active' | 'paused' | 'deleted' | string;
  last_run_at: string | null;
  next_run_at: string | null;
  run_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentHealthStatus {
  agent_type: string;
  model: string;
  status: 'healthy' | 'degraded' | 'unavailable';
  last_success_at: string | null;
  last_failure_at: string | null;
  success_rate_1h: number;
  avg_latency_ms: number;
}

export type FeedEntry =
  | { kind: 'prompt'; text: string }
  | { kind: 'task_group'; taskId: string; tasks: LiveTask[] }
  | { kind: 'tool_call'; id: string; toolName: string; input: unknown; output?: unknown; taskId: string; status: 'running' | 'done' | 'failed'; at?: string }
  | { kind: 'bash_approval'; id: string; taskId?: string; toolName: string; command: string; reason?: string; commandKey?: string; status: 'pending' | 'resolved' }
  | { kind: 'user_message'; text: string }
  | { kind: 'ai_message'; text: string }
  | { kind: 'planning' }
  | { kind: 'completion'; output?: string };

export interface LiveTask {
  id: string;
  description: string;
  agent_type: string;
  status: TaskStatus;
  current_activity?: string;
  tool_calls: number;
}

// Backward-compat / legacy types still used in a few UI paths
export interface WorkflowTask {
  id: string;
  description: string;
  agent_type: AgentType;
  depends_on: string[];
  status: TaskStatus;
  origin?: string;
  output_artifact?: string | null;
}
