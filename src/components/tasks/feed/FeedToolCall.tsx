import { useMemo, useState } from 'react';
import {
  ChevronDown, ScanSearch, Terminal,
  Globe, FileText, Zap, ListChecks,
} from 'lucide-react';
import { Highlighter } from '@lobehub/ui';
import { asRecord, extractTodoDisplay, extractSearchResults, extractFetchedSource } from './feedHelpers';
import { TodoList } from './TodoList';
import { BashRenderer } from './BashRenderer';
import { WebSearchRenderer } from './WebSearchRenderer';
import { humanizeToolName } from '../../../lib/toolLabels';
import { getFileName } from '../../../lib/fileUtils';
import { FetchUrlRenderer } from './FetchUrlRenderer';
import { formatTimeOnly } from '../../../lib/time';

export function FeedToolCall({
  toolName,
  input,
  output,
  status,
  at,
  showLeadingIcon = true,
}: {
  toolName: string;
  input: unknown;
  output?: unknown;
  status: string;
  at?: string;
  showLeadingIcon?: boolean;
}) {
  // Memoize asRecord calls so downstream useMemos aren't defeated by new object refs
  const inp = useMemo(() => asRecord(input), [input]);
  const out = useMemo(() => asRecord(output), [output]);
  const isRunning = status === 'running';

  const isBrowser = ['web_search', 'fetch_url', 'screenshot', 'browse'].includes(toolName);
  const isFile = ['file_read', 'file_write', 'file_edit'].includes(toolName);
  const isSearch = ['glob', 'grep'].includes(toolName);
  const isBash = toolName === 'bash';
  const isWebSearch = toolName === 'web_search';
  const isFetchUrl = toolName === 'fetch_url';
  const isTodo = ['write_todo', 'edit_todo', 'list_todos', 'spawn_subagent', 'await_subagents'].includes(toolName);
  const isClarification = toolName === 'request_clarification';

  const [open, setOpen] = useState(isTodo || isBash || isWebSearch || isFetchUrl);

  const filePath = String(out.path ?? inp.filePath ?? inp.path ?? inp.file_path ?? inp.filename ?? '').trim();
  const fileName = filePath ? getFileName(filePath) : 'file';
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
    return humanizeToolName(toolName);
  }, [command, fileName, include, inp, isBash, isBrowser, isTodo, pattern, query, toolName, url]);

  const Icon = isTodo ? ListChecks : isBrowser ? Globe : isFile ? FileText : isSearch ? ScanSearch : isBash ? Terminal : Zap;
  const todos = useMemo(() => extractTodoDisplay(toolName, input, output, status), [toolName, input, output, status]);
  const searchResults = useMemo(() => (isWebSearch ? extractSearchResults(output) : []), [isWebSearch, output]);
  const fetchedSource = useMemo(() => (isFetchUrl ? extractFetchedSource(input, output) : null), [isFetchUrl, input, output]);

  const timeLabel = formatTimeOnly(at);

  // File content preview for file operations
  const filePreview = useMemo(() => {
    if (!isFile || output === undefined) return '';
    const content = typeof output === 'string'
      ? output
      : typeof out.content === 'string'
        ? out.content
        : typeof out.result === 'string'
          ? out.result
          : typeof out.diff === 'string'
            ? out.diff
            : '';
    if (!content) return '';
    // Show first 80 lines or 3000 chars, whichever is smaller
    const lines = content.split('\n');
    const truncated = lines.length > 80 ? lines.slice(0, 80).join('\n') + `\n… (${lines.length - 80} more lines)` : content;
    return truncated.slice(0, 3000);
  }, [isFile, output, out]);

  const hasOutput = !isTodo && !isClarification && output !== undefined && (!isFile || !!filePreview);
  const expandable = hasOutput || todos.length > 0;

  const bashExitCode = useMemo(() => {
    if (!isBash) return undefined;
    return typeof out.exit_code === 'number' ? out.exit_code : undefined;
  }, [isBash, out.exit_code]);

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
        aria-expanded={expandable ? open : undefined}
        aria-label={expandable ? `${open ? 'Collapse' : 'Expand'} ${title}` : title}
      >
        {showLeadingIcon && <Icon size={16} className={`flex-shrink-0 ${isRunning ? 'text-primary' : 'text-muted'}`} />}
        <span className={`font-sans text-base truncate ${isRunning ? 'font-medium text-primary' : 'font-normal text-muted'}`}>
          {title}
        </span>
        {isRunning && <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-info flex-shrink-0" />}
        {timeLabel && !isRunning && (
          <span className="ml-auto font-sans text-xs text-placeholder whitespace-nowrap flex-shrink-0">
            {timeLabel}
          </span>
        )}
        {expandable && (
          <ChevronDown
            size={15}
            className={`${timeLabel && !isRunning ? '' : 'ml-auto'} flex-shrink-0 text-placeholder transition-transform duration-slow`}
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
            <BashRenderer command={command} isRunning={isRunning} hasOutput={hasOutput} renderedOutput={renderedOutput} exitCode={bashExitCode} />
          ) : isWebSearch ? (
            <WebSearchRenderer query={query} isRunning={isRunning} searchResults={searchResults} />
          ) : isFetchUrl ? (
            <FetchUrlRenderer isRunning={isRunning} fetchedSource={fetchedSource} />
          ) : isFile && filePreview ? (
            <div>
              <div className="font-sans text-xs text-placeholder mb-1.5">
                {toolName === 'file_read' ? 'Content' : toolName === 'file_edit' ? 'Changes' : 'Written'}
              </div>
              <Highlighter language={filePath.split('.').pop() || 'text'} variant="borderless" copyable showLanguage wrap>{filePreview}</Highlighter>
            </div>
          ) : (
            hasOutput && !isFile && (
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
