const TOOL_LABELS: Record<string, string> = {
  bash: 'Run Command',
  bash_execute: 'Run Command',
  file_write: 'Write File',
  file_read: 'Read File',
  file_edit: 'Edit File',
  file_delete: 'Delete File',
  glob: 'Find Files',
  grep: 'Search Files',
  web_search: 'Search Web',
  fetch_url: 'Fetch URL',
  code_execution: 'Execute Code',
  spawn_subagent: 'Start Parallel Task',
  request_clarification: 'Needs more info from you',
};

export function humanizeToolName(name: string): string {
  return TOOL_LABELS[name] ?? name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
