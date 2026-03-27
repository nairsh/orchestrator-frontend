import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown, ScanSearch, Search, Terminal, Eye, EyeOff,
  Globe, FileText, Zap, ListChecks, Square, SquareCheck, CircleAlert, Loader2,
} from 'lucide-react';
import { Tooltip, Highlighter } from '@lobehub/ui';
import { Button, Input } from '../../ui';
import { asRecord, extractTodoDisplay, extractSearchResults, extractFetchedSource, type TodoDisplay } from './feedHelpers';

interface ClarificationOption {
  label: string;
  description?: string;
}

interface ClarificationDetails {
  question: string;
  options: ClarificationOption[];
  allowCustom: boolean;
}

function normalizeClarificationOptions(value: unknown): ClarificationOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((option) => {
      if (!option || typeof option !== 'object') return null;
      const record = option as Record<string, unknown>;
      const label = typeof record.label === 'string' ? record.label.trim() : '';
      if (!label) return null;
      const description = typeof record.description === 'string' ? record.description.trim() : undefined;
      return { label, description } satisfies ClarificationOption;
    })
    .filter((option): option is ClarificationOption => option !== null);
}

function getClarificationDetails(input: unknown, output: unknown): ClarificationDetails | null {
  const inp = asRecord(input);
  const out = asRecord(output);
  const question =
    (typeof out.clarification_question === 'string' && out.clarification_question.trim()) ||
    (typeof out.question === 'string' && out.question.trim()) ||
    (typeof inp.question === 'string' && inp.question.trim()) ||
    '';

  if (!question) return null;

  const options = normalizeClarificationOptions(out.options ?? inp.options);
  const allowCustom = out.allow_custom !== false && inp.allow_custom !== false;
  return { question, options, allowCustom };
}

function ClarificationPrompt({
  details,
  disabled,
  onSubmit,
}: {
  details: ClarificationDetails;
  disabled: boolean;
  onSubmit?: (text: string) => Promise<void>;
}) {
  const [customValue, setCustomValue] = useState('');
  const [submitting, setSubmitting] = useState<string | null>(null);

  const handleSubmit = async (value: string) => {
    const text = value.trim();
    if (!text || disabled || !onSubmit) return;
    setSubmitting(text);
    try {
      await onSubmit(text);
      setCustomValue('');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="rounded-xl border border-warning/25 bg-warning/10 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-warning/15">
          <CircleAlert size={18} className="text-warning" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-warning">Needs more info from you</div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-secondary">{details.question}</p>

          {details.options.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {details.options.map((option) => {
                const busy = submitting === option.label;
                return (
                  <Button
                    key={option.label}
                    variant="secondary"
                    size="sm"
                    disabled={disabled || !!submitting}
                    onClick={() => void handleSubmit(option.label)}
                    className="max-w-full"
                  >
                    {busy ? <Loader2 size={13} className="animate-spin" /> : null}
                    <span className="truncate">{option.label}</span>
                  </Button>
                );
              })}
            </div>
          )}

          {details.options.some((option) => option.description) && (
            <div className="mt-2 flex flex-col gap-1">
              {details.options.map((option) =>
                option.description ? (
                  <div key={`${option.label}:description`} className="text-xs text-muted">
                    <span className="font-medium text-secondary">{option.label}</span>
                    <span>{` — ${option.description}`}</span>
                  </div>
                ) : null
              )}
            </div>
          )}

          {details.allowCustom && (
            <div className="mt-3 flex items-center gap-2">
              <Input
                value={customValue}
                onChange={(event) => setCustomValue(event.target.value)}
                placeholder="Type your answer…"
                disabled={disabled || !!submitting}
                className="!rounded-lg !py-2"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleSubmit(customValue);
                  }
                }}
              />
              <Button
                variant="primary"
                size="sm"
                disabled={disabled || !!submitting || !customValue.trim()}
                onClick={() => void handleSubmit(customValue)}
              >
                {submitting && customValue.trim() ? <Loader2 size={13} className="animate-spin" /> : null}
                Send
              </Button>
            </div>
          )}

          {!onSubmit && <div className="mt-3 text-xs text-muted">Reply in the input below to continue.</div>}
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FeedToolCall({
  toolName,
  input,
  output,
  status,
  showLeadingIcon = true,
  onClarificationSubmit,
}: {
  toolName: string;
  input: unknown;
  output?: unknown;
  status: string;
  showLeadingIcon?: boolean;
  onClarificationSubmit?: (text: string) => Promise<void>;
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
  const clarification = useMemo(() => (toolName === 'request_clarification' ? getClarificationDetails(input, output) : null), [input, output, toolName]);
  const isClarification = toolName === 'request_clarification' && clarification !== null;

  const [open, setOpen] = useState(isTodo || isBash || isWebSearch || isFetchUrl || isClarification);
  const [showBashOutput, setShowBashOutput] = useState(false);

  useEffect(() => {
    if (isClarification) {
      setOpen(true);
    }
  }, [isClarification]);

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
    if (toolName === 'request_clarification') return 'Needs more info from you';
    // Fallback: humanize raw slug (e.g., "send_message" → "Send Message")
    return toolName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }, [command, fileName, include, inp, isBash, isBrowser, isTodo, pattern, query, toolName, url]);

  const Icon = isTodo ? ListChecks : isBrowser ? Globe : isFile ? FileText : isSearch ? ScanSearch : isBash ? Terminal : Zap;
  const todos = extractTodoDisplay(toolName, input, output, status);
  const searchResults = useMemo(() => (isWebSearch ? extractSearchResults(output) : []), [isWebSearch, output]);
  const fetchedSource = useMemo(() => (isFetchUrl ? extractFetchedSource(input, output) : null), [isFetchUrl, input, output]);

  const hasOutput = !isTodo && !isFile && !isClarification && output !== undefined;
  const expandable = hasOutput || todos.length > 0 || isClarification;

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

          {isClarification && clarification ? (
            <ClarificationPrompt details={clarification} disabled={isRunning} onSubmit={onClarificationSubmit} />
          ) : isBash ? (
            <div className="flex flex-col gap-2">
              <div className="rounded-lg border border-border-light bg-surface overflow-hidden">
                <div className="px-3 py-1.5 border-b border-border-light flex items-center gap-2">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500'}`} />
                  <span className="font-sans text-xs text-placeholder">command</span>
                  <Tooltip title={showBashOutput ? 'Hide command output' : 'Show command output'}>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!hasOutput) return; setShowBashOutput((v) => !v); }}
                      disabled={!hasOutput}
                      className={`ml-auto flex items-center justify-center rounded border-none bg-transparent p-0.5 ${
                        hasOutput ? 'cursor-pointer text-placeholder hover:text-secondary' : 'cursor-default text-placeholder/50'
                      }`}
                      aria-label={showBashOutput ? 'Hide command output' : 'Show command output'}
                    >
                      {showBashOutput ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </Tooltip>
                </div>
                <Highlighter language="bash" variant="borderless" copyable={false} showLanguage={false} wrap>{command || 'bash command'}</Highlighter>
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
                    <Highlighter language="bash" variant="borderless" copyable={false} showLanguage={false} wrap>{renderedOutput}</Highlighter>
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
                    className="rounded-sm px-2 py-1 hover:bg-surface-warm transition-colors duration-200 no-underline fade-in-up-soft"
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
                  <a href={fetchedSource.url} target="_blank" rel="noreferrer"
                    className="block px-4 py-1 hover:bg-surface-warm transition-colors duration-200 no-underline"
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
                <Highlighter language="text" variant="borderless" copyable showLanguage={false} wrap>{renderedOutput}</Highlighter>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
