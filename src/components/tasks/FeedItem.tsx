import { useMemo, useState } from 'react';
import type { FeedEntry } from '../../api/types';
import {
  Repeat2,
  Check,
  ChevronDown,
  ScanSearch,
  Terminal,
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
      result.push({
        id: id || 'task',
        description,
        status: normalizeStatus(rec.status),
      });
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

function PromptBlock({ text }: { text: string }) {
  return <UserBubble text={text} />;
}

function TaskGroupBlock({ tasks }: { tasks: Array<{ id: string; description: string; status: string }> }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      <button
        type="button"
        className="flex items-center"
        style={{ gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        onClick={() => setOpen((v) => !v)}
      >
        <Repeat2 size={15} color="#666666" />
        <span style={{ fontFamily: 'Inter', fontSize: 13, color: '#666666' }}>Running tasks in parallel</span>
        <ChevronDown
          size={14}
          color="#666666"
          style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 0.2s ease' }}
        />
      </button>

      <div style={{ overflow: 'hidden', maxHeight: open ? 520 : 0, opacity: open ? 1 : 0, transition: 'max-height 0.2s ease, opacity 0.2s ease' }}>
        <div
          className="flex flex-col"
          style={{
            marginLeft: 10,
            marginTop: 2,
            position: 'relative',
            paddingLeft: 22,
            gap: 8,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 10,
              width: 1.5,
              background: '#DADADA',
            }}
          />
          {tasks.map((task) => {
            const status = normalizeStatus(task.status);
            return (
              <div key={task.id} className="flex items-center" style={{ gap: 10, minHeight: 34, position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: -22,
                    top: 2,
                    width: 16,
                    height: 14,
                    borderLeft: '1.5px solid #DADADA',
                    borderBottom: '1.5px solid #DADADA',
                    borderBottomLeftRadius: 10,
                  }}
                />
                {status === 'completed' || status === 'skipped' ? (
                  <Check size={15} color="#6E6E6E" style={{ flexShrink: 0 }} />
                ) : status === 'running' ? (
                  <Loader2 size={15} color="#6E6E6E" className="animate-spin" style={{ flexShrink: 0 }} />
                ) : (
                  <ScanSearch size={15} color="#8A8A8A" style={{ flexShrink: 0 }} />
                )}
                <span style={{ fontFamily: 'Inter', fontSize: 14, color: '#666666', lineHeight: 1.35 }}>
                  {task.description}
                </span>
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
    <div style={{ border: '1px solid #EAEAEA', borderRadius: 10, padding: '10px 12px', background: '#FCFCFC' }}>
      <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#7A7A7A', marginBottom: 8 }}>Task list</div>
      <div className="flex flex-col" style={{ gap: 8 }}>
        {items.map((item) => {
          const isDone = item.status === 'completed' || item.status === 'skipped';
          return (
            <div key={`${item.id}:${item.description}`} className="flex items-start" style={{ gap: 8 }}>
              {item.status === 'failed' ? (
                <CircleAlert size={16} color="#EF4444" style={{ marginTop: 1, flexShrink: 0 }} />
              ) : isDone ? (
                <SquareCheck size={16} color="#6B7280" style={{ marginTop: 1, flexShrink: 0 }} />
              ) : (
                <Square size={16} color="#9CA3AF" style={{ marginTop: 1, flexShrink: 0 }} />
              )}
              <div className="min-w-0">
                <div
                  style={{
                    fontFamily: 'Inter',
                    fontSize: 13,
                    color: isDone ? '#8A8A8A' : '#5A5A5A',
                    lineHeight: 1.35,
                    textDecoration: isDone ? 'line-through' : 'none',
                  }}
                >
                  {item.description}
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#A0A0A0', marginTop: 2 }}>{item.id}</div>
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
  const isTodo = ['write_todo', 'edit_todo', 'list_todos', 'spawn_subagent', 'await_subagents'].includes(toolName);

  const [open, setOpen] = useState(isTodo);

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
      if (toolName === 'web_search') return `Searched web${query ? `: ${query}` : ''}`;
      if (toolName === 'fetch_url') return `Fetched ${url || 'URL'}`;
      return String(query || url || toolName).slice(0, 110);
    }

    if (toolName === 'glob') {
      return `Find files matching ${pattern || '*'}`;
    }

    if (toolName === 'grep') {
      const where = include ? ` in ${include}` : '';
      return `Search${where}${pattern ? `: ${pattern}` : ''}`;
    }

    if (isBash) {
      return (command || 'bash command').slice(0, 110);
    }

    return toolName;
  }, [command, fileName, include, inp, isBash, isBrowser, isTodo, pattern, query, toolName, url]);

  const Icon = isTodo ? ListChecks : isBrowser ? Globe : isFile ? FileText : isSearch ? ScanSearch : isBash ? Terminal : Zap;
  const todos = extractTodoDisplay(toolName, input, output, status);

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
    <div className="flex flex-col" style={{ gap: 6 }}>
      <button
        type="button"
        className="flex items-center"
        style={{
          gap: 8,
          background: 'none',
          border: 'none',
          cursor: expandable ? 'pointer' : 'default',
          padding: 0,
          textAlign: 'left',
          width: '100%',
        }}
        onClick={() => {
          if (expandable) setOpen((v) => !v);
        }}
      >
        {showLeadingIcon && <Icon size={16} color={isRunning ? '#111111' : '#666666'} style={{ flexShrink: 0 }} />}
        <span style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: isRunning ? 500 : 400, color: isRunning ? '#111111' : '#666666' }}>
          {title}
        </span>
        {isRunning && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#3B82F6', flexShrink: 0 }} />}
        {expandable && (
          <ChevronDown
            size={15}
            color="#8A8A8A"
            style={{ marginLeft: 'auto', transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 0.2s ease', flexShrink: 0 }}
          />
        )}
      </button>

      <div style={{ overflow: 'hidden', maxHeight: open ? 760 : 0, opacity: open ? 1 : 0, transition: 'max-height 0.2s ease, opacity 0.16s ease' }}>
        <div className="flex flex-col" style={{ gap: 10, marginLeft: 24 }}>
          <TodoList items={todos} />

          {hasOutput && (
            <div>
              <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#8B8B8B', marginBottom: 6 }}>Result</div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, color: '#5D5D5D' }}>
                {renderedOutput}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
      <div
        style={{
          display: 'inline-flex',
          borderRadius: 18,
          background: '#EFEFEF',
          padding: '10px 14px',
          maxWidth: '72%',
          minHeight: 38,
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'Inter',
            fontSize: 15,
            lineHeight: 1.4,
            color: '#1A1A1A',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
}

function AiMessage({ text }: { text: string }) {
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
    <div style={{ borderRadius: 10, border: '1px solid #F0D7A7', background: '#FFF9EC', padding: 12 }}>
      <div className="flex items-center" style={{ gap: 8, marginBottom: 8 }}>
        {showIcon && <CircleAlert size={15} color="#B26B00" />}
        <span style={{ fontFamily: 'Inter', fontSize: 13, color: '#8A4B00' }}>Approval needed for {toolName}</span>
      </div>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, color: '#6F4D1F' }}>{command}</pre>
      {reason && <div style={{ marginTop: 8, fontFamily: 'Inter', fontSize: 12, color: '#8A6A3E' }}>{reason}</div>}
    </div>
  );
}

export function FeedItem({ entry, inTimeline = false }: { entry: FeedEntry; inTimeline?: boolean }) {
  switch (entry.kind) {
    case 'prompt':
      return <PromptBlock text={entry.text} />;
    case 'task_group':
      return <TaskGroupBlock tasks={entry.tasks} />;
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
