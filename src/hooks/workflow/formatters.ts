export const formatToolActivity = (toolName?: string): string => {
  const name = String(toolName ?? '').trim();
  if (!name) return 'Working…';
  if (name === 'bash') return 'Running command…';
  if (name === 'web_search') return 'Searching web…';
  if (name === 'fetch_url') return 'Reading URL…';
  if (name === 'file_read') return 'Reading file…';
  if (name === 'file_write') return 'Writing file…';
  if (name === 'file_edit') return 'Editing file…';
  if (name === 'glob') return 'Finding files…';
  if (name === 'grep') return 'Searching content…';
  if (name === 'spawn_subagent') return 'Starting sub-agent…';
  if (name === 'await_subagents') return 'Waiting for sub-agents…';
  if (name === 'write_todo' || name === 'edit_todo' || name === 'list_todos') return 'Updating task list…';
  return `${name.replace(/_/g, ' ')}…`;
};

export const formatToolCallLabel = (toolName?: string): string => {
  const name = String(toolName ?? '').trim();
  if (!name) return 'tool';
  return name.replace(/_/g, ' ');
};

export const appendRecentToolCalls = (existing: string[] | undefined, toolName?: string): string[] => {
  const label = formatToolCallLabel(toolName);
  const prev = Array.isArray(existing) ? existing : [];
  return [...prev, label].slice(-3);
};
