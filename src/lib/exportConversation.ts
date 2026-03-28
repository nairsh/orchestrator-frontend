import type { FeedEntry } from '../api/types';

/** Convert feed entries to a human-readable Markdown string. */
export function feedToMarkdown(objective: string, feed: FeedEntry[]): string {
  const lines: string[] = [];
  lines.push(`# ${objective}`, '');

  for (const entry of feed) {
    switch (entry.kind) {
      case 'prompt':
      case 'user_message':
        lines.push(`**You:** ${entry.text}`, '');
        break;
      case 'ai_message':
        lines.push(`**AI:** ${entry.text}`, '');
        break;
      case 'completion':
        if (entry.output) lines.push(`**Result:** ${entry.output}`, '');
        break;
      case 'tool_call': {
        const status = entry.status === 'failed' ? ' ❌' : '';
        lines.push(`> 🔧 *${toolLabel(entry.toolName)}*${status}`, '');
        const inp = formatToolPayload(entry.input);
        if (inp) lines.push(`> **Input:** ${inp}`, '');
        if (entry.output !== undefined) {
          const out = formatToolPayload(entry.output);
          if (out) {
            lines.push('<details><summary>Output</summary>', '', '```', out.slice(0, 2000), '```', '</details>', '');
          }
        }
        break;
      }
      case 'system_status':
        lines.push(`> ℹ️ ${entry.text}`, '');
        break;
      // Skip planning, task_group, bash_approval — they're internal detail
    }
  }

  return lines.join('\n').trim() + '\n';
}

function formatToolPayload(payload: unknown): string {
  if (payload === undefined || payload === null) return '';
  if (typeof payload === 'string') return payload.trim();
  try { return JSON.stringify(payload, null, 2); } catch { return String(payload); }
}

function toolLabel(name: string): string {
  const map: Record<string, string> = {
    bash: 'Ran a command',
    web_search: 'Searched the web',
    fetch_url: 'Fetched a page',
    read_file: 'Read a file',
    write_file: 'Wrote a file',
    create_file: 'Created a file',
    list_directory: 'Listed a directory',
  };
  return map[name] ?? name.replace(/_/g, ' ');
}

/** Trigger a file download in the browser. */
export function downloadFile(content: string, filename: string, mimeType = 'text/markdown') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
