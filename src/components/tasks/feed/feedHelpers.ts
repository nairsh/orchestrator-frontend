import { Terminal, Search, Globe, FileText, ListChecks, ScanSearch, Wrench, Zap } from 'lucide-react';
import type { ElementType } from 'react';
import type { FeedEntry } from '../../../api/types';

/* ── Feed types ──────────────────────────────────────────────── */

export type ToolEntry = Extract<FeedEntry, { kind: 'tool_call' }>;
export type RenderRow =
  | { kind: 'entry'; key: string; entry: FeedEntry }
  | { kind: 'tool_parallel'; key: string; entries: ToolEntry[] };

export function toolIconForName(toolName: string) {
  if (['write_todo', 'edit_todo', 'list_todos', 'spawn_subagent', 'await_subagents'].includes(toolName)) return ListChecks;
  if (['file_read', 'file_write', 'file_edit'].includes(toolName)) return FileText;
  if (['web_search', 'fetch_url', 'browse', 'screenshot'].includes(toolName)) return Globe;
  if (['glob', 'grep'].includes(toolName)) return ScanSearch;
  if (toolName === 'bash') return Terminal;
  return Wrench;
}

/* ── FeedItem helpers ────────────────────────────────────────── */

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

export function normalizeStatus(status: unknown): 'pending' | 'running' | 'completed' | 'failed' | 'skipped' {
  const s = String(status ?? '').toLowerCase();
  if (s === 'running') return 'running';
  if (s === 'completed' || s === 'ok' || s === 'done') return 'completed';
  if (s === 'failed' || s === 'error') return 'failed';
  if (s === 'skipped') return 'skipped';
  return 'pending';
}

export type TodoDisplay = {
  id: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
};

export function extractTodoDisplay(toolName: string, input: unknown, output: unknown, fallbackStatus: string): TodoDisplay[] {
  const inp = asRecord(input);
  const out = asRecord(output);
  const result: TodoDisplay[] = [];

  if (toolName === 'list_todos') {
    const todos = Array.isArray(out.todos) ? out.todos : [];
    for (const item of todos) {
      const rec = asRecord(item);
      const id = String(rec.id ?? rec.todo_id ?? '').trim();
      const description = String(rec.description ?? rec.title ?? 'Untitled task').trim();
      if (!id && !description) continue;
      result.push({ id: id || 'task', description, status: normalizeStatus(rec.status) });
    }
    return result;
  }

  if (toolName === 'await_subagents') {
    const completed = Array.isArray(out.completed) ? out.completed : [];
    const running = Array.isArray(out.running) ? out.running : [];
    const failed = Array.isArray(out.failed) ? out.failed : [];

    completed.forEach((id) => result.push({ id: String(id), description: String(id), status: 'completed' }));
    running.forEach((id) => result.push({ id: String(id), description: String(id), status: 'running' }));
    failed.forEach((entry) => {
      const rec = asRecord(entry);
      const id = String(rec.display_todo_id ?? rec.todo_id ?? 'task');
      const error = String(rec.error ?? 'Failed');
      result.push({ id, description: `${id}: ${error}`, status: 'failed' });
    });
    return result;
  }

  if (toolName === 'write_todo' || toolName === 'edit_todo' || toolName === 'spawn_subagent') {
    const id = String(out.display_todo_id ?? out.todo_id ?? inp.todo_id ?? '').trim();
    const description = String(out.description ?? inp.description ?? 'Task').trim();
    const fallback = fallbackStatus === 'running' ? 'running' : 'pending';
    const status =
      toolName === 'spawn_subagent'
        ? 'running'
        : normalizeStatus(out.status ?? inp.status ?? fallback);
    if (id || description) {
      result.push({ id: id || 'task', description, status: normalizeStatus(status) });
    }
  }

  return result;
}

export type SearchResultDisplay = {
  title: string;
  url: string;
  resolvedUrl: string;
  domain: string;
};

export type FetchedSourceDisplay = {
  title: string;
  url: string;
  domain: string;
};

export function normalizeSearchResultUrl(rawUrl: string): string {
  const input = rawUrl.trim();
  if (!input) return input;
  try {
    const parsed = new URL(input);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (host.includes('duckduckgo.com') && parsed.pathname.startsWith('/l/')) {
      const redirected = parsed.searchParams.get('uddg') ?? parsed.searchParams.get('u');
      if (redirected) {
        try { return decodeURIComponent(redirected); } catch { return redirected; }
      }
    }
    return input;
  } catch {
    return input;
  }
}

export function extractSearchResults(output: unknown): SearchResultDisplay[] {
  const parseFrom = (value: unknown): SearchResultDisplay[] => {
    const rec = asRecord(value);
    const raw = Array.isArray(rec.results) ? rec.results : [];
    const items: SearchResultDisplay[] = [];
    for (const item of raw) {
      const row = asRecord(item);
      const url = String(row.url ?? '').trim();
      if (!url) continue;
      const resolvedUrl = normalizeSearchResultUrl(url);
      const title = String(row.title ?? url).trim() || url;
      let domain = resolvedUrl;
      try { domain = new URL(resolvedUrl).hostname.replace(/^www\./, ''); } catch { /* keep fallback */ }
      items.push({ title, url, resolvedUrl, domain });
    }
    return items;
  };
  if (typeof output === 'string') {
    try { return parseFrom(JSON.parse(output)); } catch { return []; }
  }
  return parseFrom(output);
}

export function extractFetchedSource(input: unknown, output: unknown): FetchedSourceDisplay | null {
  const fromOutput = () => {
    const parse = (value: unknown): FetchedSourceDisplay | null => {
      const rec = asRecord(value);
      const rawUrl = String(rec.url ?? '').trim();
      if (!rawUrl) return null;
      const resolvedUrl = normalizeSearchResultUrl(rawUrl);
      const title = String(rec.title ?? resolvedUrl).trim() || resolvedUrl;
      let domain = resolvedUrl;
      try { domain = new URL(resolvedUrl).hostname.replace(/^www\./, ''); } catch { /* keep fallback */ }
      return { title, url: resolvedUrl, domain };
    };
    if (typeof output === 'string') {
      try { return parse(JSON.parse(output)); } catch { return null; }
    }
    return parse(output);
  };
  const out = fromOutput();
  if (out) return out;
  const inp = asRecord(input);
  const rawUrl = String(inp.url ?? '').trim();
  if (!rawUrl) return null;
  const resolvedUrl = normalizeSearchResultUrl(rawUrl);
  let domain = resolvedUrl;
  try { domain = new URL(resolvedUrl).hostname.replace(/^www\./, ''); } catch { /* keep fallback */ }
  return { title: resolvedUrl, url: resolvedUrl, domain };
}

export function compactModelLabel(model?: string): string | null {
  if (!model) return null;
  const leaf = model.split('/').pop() ?? model;
  const normalized = leaf.replace(/[-_]+/g, ' ').trim();
  if (!normalized) return null;
  if (/codex/i.test(normalized)) return 'Codex';
  if (/gpt/i.test(normalized)) return 'GPT';
  if (/claude/i.test(normalized)) return 'Claude';
  if (/gemini/i.test(normalized)) return 'Gemini';
  return normalized.length > 18 ? `${normalized.slice(0, 18)}…` : normalized;
}

export function taskActivityLabel(task: { status: string; current_activity?: string }): string {
  const status = normalizeStatus(task.status);
  if (status === 'completed') return 'Task completed';
  if (status === 'failed') return 'Task failed';
  if (status === 'skipped') return 'Task skipped';
  return task.current_activity?.trim() || 'Working…';
}

export function agentDisplayName(agentType?: string): string {
  const t = String(agentType ?? '').trim().toLowerCase();
  if (t === 'research') return 'Research';
  if (t === 'analyze') return 'Analysis';
  if (t === 'write') return 'Writing';
  if (t === 'code') return 'Code';
  if (t === 'file') return 'Files';
  if (t === 'task') return 'Task';
  if (t) return t.charAt(0).toUpperCase() + t.slice(1);
  return 'AI';
}

export function iconForRecentToolCall(toolCall: string): ElementType {
  const normalized = toolCall.trim().toLowerCase().replace(/\s+/g, '_');
  if (normalized.includes('bash')) return Terminal;
  if (normalized.includes('web_search')) return Search;
  if (normalized.includes('fetch_url')) return Globe;
  if (normalized.includes('file_read') || normalized.includes('file_write') || normalized.includes('file_edit')) return FileText;
  if (normalized.includes('glob') || normalized.includes('grep')) return ScanSearch;
  return Zap;
}

export function parseCitationsFromText(text: string): Array<{ url: string; title?: string }> {
  const citations: Array<{ url: string; title?: string }> = [];
  const urlPattern = /\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
  let match;
  const seen = new Set<string>();
  while ((match = urlPattern.exec(text)) !== null) {
    if (!seen.has(match[2])) {
      seen.add(match[2]);
      citations.push({ url: match[2], title: match[1] || undefined });
    }
  }
  return citations;
}
