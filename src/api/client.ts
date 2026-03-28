// Barrel re-export — all consumers continue importing from './client' or '../api/client'.

export { type ApiConfig, ApiError } from './core';

export {
  type WorkflowDetails,
  type ContextFileUpload,
  type CreateWorkflowInput,
  createWorkflow,
  listWorkflows,
  cancelWorkflow,
  getWorkflow,
  getWorkflowTrace,
  continueWorkflow,
  retryWorkflow,
  approveWorkflowTask,
  approveBashCommand,
  getPendingApprovals,
} from './workflows';

export {
  getModels,
  getModelPreferences,
  saveModelPreferences,
  resetModelPreferences,
  getPresets,
  invalidateModelsCache,
} from './models';

export {
  listSkills,
  getSkill,
  upsertSkill,
  removeSkill,
  importSkill,
} from './skills';

export {
  getBillingBalance,
  getBillingUsage,
  getBillingTransactions,
  topUpCredits,
} from './billing';

export {
  listConnectorProviders,
  listConnectors,
  startConnectorOAuth,
  validateConnector,
  disconnectConnector,
} from './connectors';

export {
  type CreateScheduleInput,
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  triggerSchedule,
} from './schedules';

export {
  listMemories,
  saveMemory,
  deleteMemory,
} from './memory';

export {
  listKnowledgeDocuments,
  uploadKnowledgeDocument,
  getKnowledgeDocument,
  deleteKnowledgeDocument,
  searchKnowledge,
} from './knowledge';

export {
  listTemplates,
  useTemplate,
  createTemplate,
  deleteTemplate,
} from './templates';

export {
  listProviders,
  getProviderPresets,
  createProvider,
  updateProvider,
  deleteProvider,
} from './providers';

export {
  listTeams,
  getWorkspace,
  getAgentHealth,
  getSystemHealth,
  checkHealth,
} from './system';
