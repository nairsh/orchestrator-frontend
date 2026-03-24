import { useMemo, useState } from 'react';
import type { FeedEntry } from '../../api/types';
import {
  Repeat2,
  Check,
  ChevronDown,
  ScanSearch,
  Search,
  Terminal,
  Bot,
  Pencil,
  Eye,
  EyeOff,
  Globe,
  FileText,
  Zap,
  ListChecks,
  Square,
  SquareCheck,
  CircleAlert,
  Loader2,
} from 'lucide-react';
import { Markdown } from '../markdown/Markdown';
import { ModelIcon, resolveModelIconKey, type ModelIconOverrides } from '../../lib/modelIcons';

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function normalizeStatus(status: unknown): 'pending' | 'running' | 'completed' | 'failed' | 'skipped' {
  const s = String(status ?? '').toLowerCase();
  if (s === 'running') return 'running';
  if (s === 'completed' || s === 'ok' || s === 'done') return 'completed';
  if (s === 'failed' || s === 'error') return 'failed';
  if (s === 'skipped') return 'skipped';
  return 'pending';
}

type TodoDisplay = {
  id: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
};

function extractTodoDisplay(toolName: string, input: unknown, output: unknown, fallbackStatus: string): TodoDisplay[] {
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

    completed.forEach((id) => {
      result.push({ id: String(id), description: String(id), status: 'completed' });
    });
    running.forEach((id) => {
      result.push({ id: String(id), description: String(id), status: 'running' });
    });
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

type SearchResultDisplay = {
  title: string;
  url: string;
  resolvedUrl: string;
  domain: string;
};

type FetchedSourceDisplay = {
  title: string;
  url: string;
  domain: string;
};

function normalizeSearchResultUrl(rawUrl: string): string {
  const input = rawUrl.trim();
  if (!input) return input;

  try {
    const parsed = new URL(input);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (host.includes('duckduckgo.com') && parsed.pathname.startsWith('/l/')) {
      const redirected = parsed.searchParams.get('uddg') ?? parsed.searchParams.get('u');
      if (redirected) {
        try {
          return decodeURIComponent(redirected);
        } catch {
          return redirected;
        }
      }
    }
    return input;
  } catch {
    return input;
  }
}

function extractSearchResults(output: unknown): SearchResultDisplay[] {
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
      try {
        domain = new URL(resolvedUrl).hostname.replace(/^www\./, '');
      } catch {
        // Keep raw url as fallback
      }
      items.push({ title, url, resolvedUrl, domain });
    }

    return items;
  };

  if (typeof output === 'string') {
    try {
      return parseFrom(JSON.parse(output));
    } catch {
      return [];
    }
  }

  return parseFrom(output);
}

function extractFetchedSource(input: unknown, output: unknown): FetchedSourceDisplay | null {
  const fromOutput = () => {
    const parse = (value: unknown): FetchedSourceDisplay | null => {
      const rec = asRecord(value);
      const rawUrl = String(rec.url ?? '').trim();
      if (!rawUrl) return null;
      const resolvedUrl = normalizeSearchResultUrl(rawUrl);
      const title = String(rec.title ?? resolvedUrl).trim() || resolvedUrl;
      let domain = resolvedUrl;
      try {
        domain = new URL(resolvedUrl).hostname.replace(/^www\./, '');
      } catch {
        // keep fallback
      }
      return { title, url: resolvedUrl, domain };
    };

    if (typeof output === 'string') {
      try {
        return parse(JSON.parse(output));
      } catch {
        return null;
      }
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
  try {
    domain = new URL(resolvedUrl).hostname.replace(/^www\./, '');
  } catch {
    // keep fallback
  }
  return { title: resolvedUrl, url: resolvedUrl, domain };
}

function PromptBlock({ text }: { text: string }) {
  return <UserBubble text={text} />;
}

function SystemStatus({ text }: { text: string }) {
  return <span className="font-sans text-sm text-muted">{text}</span>;
}

function compactModelLabel(model?: string): string | null {
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

function taskActivityLabel(task: { status: string; current_activity?: string }): string {
  const status = normalizeStatus(task.status);
  if (status === 'completed') return 'Task completed';
  if (status === 'failed') return 'Task failed';
  if (status === 'skipped') return 'Task skipped';
  return task.current_activity?.trim() || 'Working…';
}

function agentDisplayName(agentType?: string): string {
  const t = String(agentType ?? '').trim().toLowerCase();
  if (t === 'research') return 'Research Agent';
  if (t === 'analyze') return 'Analyze Agent';
  if (t === 'write') return 'Write Agent';
  if (t === 'code') return 'Code Agent';
  if (t === 'file') return 'File Agent';
  if (t === 'task') return 'Task Agent';
  return 'Sub Agent';
}

function iconForRecentToolCall(toolCall: string) {
  const normalized = toolCall.trim().toLowerCase().replace(/\s+/g, '_');
  if (normalized.includes('bash')) return Terminal;
  if (normalized.includes('web_search')) return Search;
  if (normalized.includes('fetch_url')) return Globe;
  if (normalized.includes('file_read') || normalized.includes('file_write') || normalized.includes('file_edit')) {
    return FileText;
  }
  if (normalized.includes('glob') || normalized.includes('grep')) return ScanSearch;
  return Zap;
}

function TaskGroupBlock({
  tasks,
  modelIconOverrides,
}: {
  tasks: Array<{
    id: string;
    description: string;
    agent_type?: string;
    status: string;
    current_activity?: string;
    model?: string;
    recent_tool_calls?: string[];
    tool_calls?: number;
  }>;
  modelIconOverrides?: ModelIconOverrides;
}) {
  const [open, setOpen] = useState(true);
  const taskCount = tasks.length;
  const headerLabel = taskCount <= 1 ? 'Running task' : 'Running tasks in parallel';
  const isParallel = taskCount > 1;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="flex items-center gap-2 bg-transparent border-none cursor-pointer p-0"
        onClick={() => setOpen((v) => !v)}
      >
        <Repeat2 size={15} className="text-muted" />
        <span className="font-sans text-sm text-muted">{headerLabel}</span>
        <ChevronDown
          size={14}
          className="text-muted transition-transform duration-slow"
          style={{ transform: open ? 'none' : 'rotate(-90deg)' }}
        />
      </button>

        <div
          className="overflow-hidden transition-all duration-slow"
          style={{ maxHeight: open ? 1200 : 0, opacity: open ? 1 : 0 }}
        >
        <div
          className={`flex flex-col gap-3 mt-0.5 relative ${isParallel ? 'ml-2.5 pl-[22px]' : ''}`}
        >
          {isParallel && <div className="absolute left-0 top-0 bottom-2.5 w-[1.5px] bg-border" />}
          {tasks.map((task) => {
            const status = normalizeStatus(task.status);
            const modelBadge = compactModelLabel(task.model);
            const agentName = agentDisplayName(task.agent_type);
            const recentToolCalls = Array.isArray(task.recent_tool_calls)
              ? task.recent_tool_calls.slice(-3)
              : [];
            const modelProvider = task.model?.includes('/') ? task.model.split('/')[0] : undefined;
            const iconKey = task.model
              ? resolveModelIconKey(task.model, modelProvider, modelIconOverrides)
              : undefined;
            return (
              <div key={task.id} className="relative">
                {isParallel && (
                  <div className="absolute -left-[22px] top-0.5 w-4 h-3.5 border-l-[1.5px] border-b-[1.5px] border-border rounded-bl-[10px]" />
                )}

                <div className="rounded-xl border border-border-light bg-surface overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-light/70 bg-surface-tertiary">
                    <div className="flex items-center gap-3 min-w-0">
                      <Bot size={18} className="text-muted flex-shrink-0" />
                      <span className="font-sans text-base font-medium text-primary truncate">
                        {agentName} - {task.description}
                      </span>
                      {modelBadge && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 font-sans text-2xs text-secondary bg-surface-warm flex-shrink-0">
                          {iconKey ? <ModelIcon iconKey={iconKey} size={12} /> : null}
                          <span>{modelBadge}</span>
                        </span>
                      )}
                    </div>

                    {status === 'completed' || status === 'skipped' ? (
                      <Check size={15} className="flex-shrink-0 text-muted" />
                    ) : status === 'running' ? (
                      <Loader2 size={15} className="flex-shrink-0 text-muted animate-spin" />
                    ) : (
                      <CircleAlert size={15} className="flex-shrink-0 text-warning" />
                    )}
                  </div>

                  <div className="px-4 py-3 flex items-center gap-2.5">
                    <Pencil size={16} className="text-placeholder flex-shrink-0" />
                    <span className="font-sans text-sm text-secondary truncate">{taskActivityLabel(task)}</span>
                    {(task.tool_calls ?? 0) > 0 && (
                      <span className="ml-auto flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-surface-warm border border-border-light px-2 py-0.5 font-mono text-2xs text-placeholder">
                        <Zap size={10} />
                        {task.tool_calls} {task.tool_calls === 1 ? 'tool' : 'tools'}
                      </span>
                    )}
                  </div>

                  {recentToolCalls.length > 0 && (
                    <div className="px-4 pb-3 -mt-1 flex flex-col gap-1.5">
                      {[...recentToolCalls].reverse().map((toolCall, idx) => {
                        const Icon = iconForRecentToolCall(toolCall);
                        return (
                          <div key={`${task.id}:${toolCall}:${idx}`} className="flex items-center gap-2 min-w-0">
                            <Icon size={13} className="text-placeholder flex-shrink-0" />
                            <span className="font-mono text-2xs text-placeholder truncate">{toolCall}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TodoList({ items }: { items: TodoDisplay[] }) {
  if (items.length === 0) return null;

  return (
    <div className="border border-border-light rounded-lg p-3 bg-surface">
      <div className="font-sans text-xs text-subtle mb-2">Task list</div>
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const isDone = item.status === 'completed' || item.status === 'skipped';
          return (
            <div key={`${item.id}:${item.description}`} className="flex items-start gap-2">
              {item.status === 'failed' ? (
                <CircleAlert size={16} className="mt-px flex-shrink-0 text-danger" />
              ) : isDone ? (
                <SquareCheck size={16} className="mt-px flex-shrink-0 text-muted" />
              ) : (
                <Square size={16} className="mt-px flex-shrink-0 text-placeholder" />
              )}
              <div className="min-w-0">
                <div className={`font-sans text-sm leading-snug ${isDone ? 'text-placeholder line-through' : 'text-secondary'}`}>
                  {item.description}
                </div>
                <div className="font-sans text-2xs text-placeholder mt-0.5">{item.id}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ToolCallBlock({
  toolName,
  input,
  output,
  status,
  showLeadingIcon = true,
}: {
  toolName: string;
  input: unknown;
  output?: unknown;
  status: string;
  showLeadingIcon?: boolean;
}) {
  const inp = asRecord(input);
  const out = asRecord(output);
  const isRunning = status === 'running';

  const isBrowser = ['web_search', 'fetch_url', 'screenshot', 'browse'].includes(toolName);
  const isFile = ['file_read', 'file_write', 'file_edit'].includes(toolName);
  const isSearch = ['glob', 'grep'].includes(toolName);
  const isBash = toolName === 'bash';
  const isWebSearch = toolName === 'web_search';
  const isFetchUrl = toolName === 'fetch_url';
  const isTodo = ['write_todo', 'edit_todo', 'list_todos', 'spawn_subagent', 'await_subagents'].includes(toolName);

  const [open, setOpen] = useState(isTodo || isBash || isWebSearch || isFetchUrl);
  const [showBashOutput, setShowBashOutput] = useState(false);

  const filePath = String(out.path ?? inp.filePath ?? inp.path ?? inp.file_path ?? inp.filename ?? '').trim();
  const fileName = filePath ? filePath.split('/').pop() ?? filePath : 'file';
  const pattern = String(inp.pattern ?? '').trim();
  const include = String(inp.include ?? '').trim();
  const command = String(inp.command ?? out.command ?? '').trim();
  const query = String(inp.query ?? '').trim();
  const url = String(inp.url ?? out.url ?? '').trim();

  const title = useMemo(() => {
    if (isTodo) {
      const description = typeof inp.description === 'string' ? inp.description : undefined;
      if (description) return description;
      if (toolName === 'write_todo') return 'Creating task list item';
      if (toolName === 'edit_todo') return 'Updating task list item';
      if (toolName === 'list_todos') return 'Loading task list';
      if (toolName === 'spawn_subagent') return 'Starting task';
      if (toolName === 'await_subagents') return 'Waiting for running tasks';
    }

    if (toolName === 'file_read') return `Read ${fileName}`;
    if (toolName === 'file_write') return `Wrote ${fileName}`;
    if (toolName === 'file_edit') return `Edited ${fileName}`;

    if (isBrowser) {
      if (toolName === 'web_search') return 'Searching';
      if (toolName === 'fetch_url') return 'Fetched';
      return String(query || url || toolName).slice(0, 110);
    }

    if (toolName === 'glob') return `Find files matching ${pattern || '*'}`;
    if (toolName === 'grep') {
      const where = include ? ` in ${include}` : '';
      return `Search${where}${pattern ? `: ${pattern}` : ''}`;
    }

    if (isBash) return 'Running command';

    return toolName;
  }, [command, fileName, include, inp, isBash, isBrowser, isTodo, pattern, query, toolName, url]);

  const Icon = isTodo ? ListChecks : isBrowser ? Globe : isFile ? FileText : isSearch ? ScanSearch : isBash ? Terminal : Zap;
  const todos = extractTodoDisplay(toolName, input, output, status);
  const searchResults = useMemo(() => (isWebSearch ? extractSearchResults(output) : []), [isWebSearch, output]);
  const fetchedSource = useMemo(() => (isFetchUrl ? extractFetchedSource(input, output) : null), [isFetchUrl, input, output]);

  const hasOutput = !isTodo && !isFile && output !== undefined;
  const expandable = hasOutput || todos.length > 0;

  const renderedOutput = useMemo(() => {
    if (!hasOutput) return '';

    if (isBash) {
      const stdout = typeof out.stdout === 'string' ? out.stdout.trim() : '';
      const stderr = typeof out.stderr === 'string' ? out.stderr.trim() : '';
      const exitCode = typeof out.exit_code === 'number' ? out.exit_code : undefined;

      const chunks: string[] = [];
      if (stdout) chunks.push(stdout);
      if (stderr) chunks.push(`stderr:\n${stderr}`);
      if (typeof exitCode === 'number') chunks.push(`exit code: ${exitCode}`);
      return chunks.join('\n\n') || 'Command finished';
    }

    return typeof output === 'string' ? output : JSON.stringify(output, null, 2).slice(0, 2200);
  }, [hasOutput, isBash, out, output]);

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        className={`flex items-center gap-2 bg-transparent border-none p-0 text-left w-full ${expandable ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={() => { if (expandable) setOpen((v) => !v); }}
      >
        {showLeadingIcon && <Icon size={16} className={`flex-shrink-0 ${isRunning ? 'text-primary' : 'text-muted'}`} />}
        <span className={`font-sans text-base ${isRunning ? 'font-medium text-primary' : 'font-normal text-muted'}`}>
          {title}
        </span>
        {isRunning && <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-info flex-shrink-0" />}
        {expandable && (
          <ChevronDown
            size={15}
            className="ml-auto flex-shrink-0 text-placeholder transition-transform duration-slow"
            style={{ transform: open ? 'none' : 'rotate(-90deg)' }}
          />
        )}
      </button>

      <div
        className="overflow-hidden transition-all duration-slow"
        style={{ maxHeight: open ? 900 : 0, opacity: open ? 1 : 0 }}
      >
        <div className="flex flex-col gap-2.5 ml-6">
          <TodoList items={todos} />

          {isBash ? (
            <div className="flex flex-col gap-2">
              <div className="rounded-lg border border-border-light bg-surface overflow-hidden">
                <div className="px-3 py-1.5 border-b border-border-light flex items-center gap-2">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500'}`}
                  />
                  <span className="font-sans text-xs text-placeholder">command</span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (!hasOutput) return;
                      setShowBashOutput((value) => !value);
                    }}
                    disabled={!hasOutput}
                    className={`ml-auto flex items-center justify-center rounded border-none bg-transparent p-0.5 ${
                      hasOutput ? 'cursor-pointer text-placeholder hover:text-secondary' : 'cursor-default text-placeholder/50'
                    }`}
                    aria-label={showBashOutput ? 'Hide command output' : 'Show command output'}
                    title={showBashOutput ? 'Hide output' : 'Show output'}
                  >
                    {showBashOutput ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </div>
                <pre className="m-0 px-3 py-2 whitespace-pre-wrap font-mono text-xs text-secondary">{command || 'bash command'}</pre>
              </div>

              <div
                className="overflow-hidden transition-all duration-slow"
                aria-hidden={!showBashOutput || !hasOutput}
                style={{ maxHeight: showBashOutput && hasOutput ? 420 : 0, opacity: showBashOutput && hasOutput ? 1 : 0 }}
              >
                {hasOutput && renderedOutput && renderedOutput !== 'Command finished' && (
                  <div className="rounded-lg border border-border-light bg-surface overflow-hidden">
                    <div className="px-3 py-1.5 border-b border-border-light flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="font-sans text-xs text-placeholder">output</span>
                    </div>
                    <pre className="m-0 px-3 py-2 whitespace-pre-wrap font-mono text-xs text-secondary">{renderedOutput}</pre>
                  </div>
                )}
              </div>
            </div>
          ) : isWebSearch ? (
            <div className="flex flex-col gap-2">
              {query && (
                <div className="inline-flex items-center gap-1.5 self-start rounded-sm bg-surface-warm border border-border-light px-2 py-0.5 fade-in-soft">
                  <Search size={13} className="text-placeholder flex-shrink-0" />
                  <span className="font-mono text-xs tracking-wide uppercase text-placeholder truncate max-w-[420px]">
                    {query}
                  </span>
                </div>
              )}

              <div className="font-sans text-sm text-secondary">Reading sources · {searchResults.length}</div>

              <div className="rounded-lg border border-border-light bg-surface overflow-hidden px-2 py-1.5 flex flex-col gap-0.5 fade-in-soft">
                {searchResults.length === 0 && (
                  <div className="px-1.5 py-1.5 font-sans text-xs text-placeholder">
                    {isRunning ? 'Searching sources…' : 'No sources returned'}
                  </div>
                )}

                {searchResults.map((result, idx) => (
                  <a
                    key={`${result.resolvedUrl}:${idx}`}
                    href={result.resolvedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-sm px-2 py-1 hover:bg-surface-warm transition-colors duration-fast no-underline fade-in-up-soft"
                    style={{ animationDelay: `${Math.min(idx * 28, 220)}ms` }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={`https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(result.resolvedUrl)}`}
                        alt=""
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        loading="lazy"
                      />
                      <span className="font-sans text-xs text-primary truncate">{result.title}</span>
                      <span className="font-mono text-2xs text-placeholder truncate">{result.domain}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ) : isFetchUrl ? (
            <div className="flex flex-col gap-2">
              <div className="rounded-lg border border-border-light bg-surface overflow-hidden px-0 py-0 fade-in-soft">
                {!fetchedSource && (
                  <div className="px-1.5 py-1.5 font-sans text-xs text-placeholder">
                    {isRunning ? 'Fetching URL…' : 'No fetched URL details'}
                  </div>
                )}

                {fetchedSource && (
                  <a
                    href={fetchedSource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block px-4 py-1 hover:bg-surface-warm transition-colors duration-fast no-underline"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 h-5">
                      <img
                        src={`https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(fetchedSource.url)}`}
                        alt=""
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        loading="lazy"
                      />
                      <span className="font-sans text-xs text-primary truncate leading-[1]">{fetchedSource.title}</span>
                      <span className="font-mono text-2xs text-placeholder truncate leading-[1]">{fetchedSource.domain}</span>
                    </div>
                  </a>
                )}
              </div>
            </div>
          ) : (
            hasOutput && (
              <div>
                <div className="font-sans text-xs text-placeholder mb-1.5">Result</div>
                <pre className="m-0 whitespace-pre-wrap font-mono text-xs text-secondary">
                  {renderedOutput}
                </pre>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="w-full flex justify-end">
      <div className="inline-flex rounded-2xl bg-userbubble px-3.5 py-2.5 max-w-[72%] min-h-[38px] items-center">
        <span className="font-sans text-md leading-relaxed text-primary whitespace-pre-wrap break-all">
          {text}
        </span>
      </div>
    </div>
  );
}

function AiMessage({ text }: { text: string }) {
  const isError = /^workflow failed:/i.test(text.trim());
  if (isError) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 flex items-start gap-3">
        <CircleAlert size={18} className="text-danger flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="font-sans text-sm font-medium text-danger">Workflow Failed</div>
          <div className="font-sans text-sm text-secondary mt-1">
            {text.replace(/^workflow failed:\s*/i, '')}
          </div>
        </div>
      </div>
    );
  }
  return <Markdown content={text} />;
}

function CompletionBlock({ output }: { output?: string }) {
  if (!output) return null;
  return <Markdown content={output} />;
}

function BashApprovalBlock({
  toolName,
  command,
  reason,
  showIcon = true,
}: {
  toolName: string;
  command: string;
  reason?: string;
  showIcon?: boolean;
}) {
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/15 p-3">
      <div className="flex items-center gap-2 mb-2">
        {showIcon && <CircleAlert size={15} className="text-warning" />}
        <span className="font-sans text-sm text-warning">Approval needed for {toolName}</span>
      </div>
      <pre className="m-0 whitespace-pre-wrap font-mono text-xs text-warning">{command}</pre>
      {reason && <div className="mt-2 font-sans text-xs text-warning">{reason}</div>}
    </div>
  );
}

export function FeedItem({
  entry,
  inTimeline = false,
  modelIconOverrides,
}: {
  entry: FeedEntry;
  inTimeline?: boolean;
  modelIconOverrides?: ModelIconOverrides;
}) {
  switch (entry.kind) {
    case 'prompt':
      return <PromptBlock text={entry.text} />;
    case 'system_status':
      return <SystemStatus text={entry.text} />;
    case 'task_group':
      return <TaskGroupBlock tasks={entry.tasks} modelIconOverrides={modelIconOverrides} />;
    case 'tool_call':
      return <ToolCallBlock toolName={entry.toolName} input={entry.input} output={entry.output} status={entry.status} showLeadingIcon={!inTimeline} />;
    case 'bash_approval':
      return <BashApprovalBlock toolName={entry.toolName} command={entry.command} reason={entry.reason} showIcon={!inTimeline} />;
    case 'user_message':
      return <UserBubble text={entry.text} />;
    case 'ai_message':
      return <AiMessage text={entry.text} />;
    case 'planning':
      return null;
    case 'completion':
      return <CompletionBlock output={entry.output} />;
    default:
      return null;
  }
}
