const internalPlannerToolLabels = new Set([
  'write_todo',
  'edit_todo',
  'list_todos',
  'spawn_subagent',
  'await_subagents',
]);

export const isInternalPlannerTool = (toolName?: string): boolean => {
  const normalized = String(toolName ?? '').trim().toLowerCase();
  return internalPlannerToolLabels.has(normalized);
};

export const isInternalCapabilityDump = (text?: string): boolean => {
  if (typeof text !== 'string') return false;
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;

  if (normalized.startsWith('i have access to the following tools')) return true;

  let markerCount = 0;
  const markers = [
    'web_search:',
    'fetch_url:',
    'bash:',
    'file_read:',
    'file_write:',
    'file_edit:',
    'grep:',
    'glob:',
    'run_skill:',
    'write_todo:',
    'edit_todo:',
    'list_todos:',
  ];

  for (const marker of markers) {
    if (normalized.includes(marker)) markerCount += 1;
    if (markerCount >= 4) return true;
  }

  return false;
};

export const isInternalPlannerNoise = (text?: string): boolean => {
  if (typeof text !== 'string') return false;
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;

  if (normalized === 'running tasks in parallel') return true;
  if (normalized === 'task list') return true;

  return internalPlannerToolLabels.has(normalized);
};

export const isEnvironmentSetupTool = (toolName?: string): boolean => {
  const normalized = String(toolName ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return (
    normalized.includes('openterminal') ||
    normalized === 'startenvironment' ||
    normalized.includes('environmentsetup')
  );
};
