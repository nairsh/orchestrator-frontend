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
      case 'tool_call':
        lines.push(`> 🔧 *${toolLabel(entry.toolName)}*${entry.status === 'failed' ? ' (failed)' : ''}`, '');
        break;
      case 'system_status':
        lines.push(`> ℹ️ ${entry.text}`, '');
        break;
      // Skip planning, task_group, bash_approval — they're internal detail
    }
  }

  return lines.join('\n').trim() + '\n';
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
