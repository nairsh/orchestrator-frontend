import { CircleAlert } from 'lucide-react';
import { Alert, Highlighter } from '@lobehub/ui';
import type { FeedEntry } from '../../api/types';
import { Markdown } from '../markdown/Markdown';
import { CitationCard } from '../CitationCard';
import type { ModelIconOverrides } from '../../lib/modelIcons';
import { FeedTaskGroup } from './feed/FeedTaskGroup';
import { FeedToolCall } from './feed/FeedToolCall';
import { parseCitationsFromText } from './feed/feedHelpers';
import { ApprovalGate } from '../ApprovalGate';

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
};

function humanizeToolName(name: string): string {
  return TOOL_LABELS[name] ?? name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
      <Alert
        type="error"
        variant="outlined"
        message="Task Failed"
        description={text.replace(/^workflow failed:\s*/i, '')}
      />
    );
  }
  const citations = parseCitationsFromText(text);
  return (
    <div>
      <Markdown content={text} />
      {citations.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {citations.map((citation, idx) => (
            <CitationCard key={idx} url={citation.url} title={citation.title} index={idx + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function CompletionBlock({ output }: { output?: string }) {
  if (!output) return null;
  const citations = parseCitationsFromText(output);
  return (
    <div>
      <Markdown content={output} />
      {citations.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {citations.map((citation, idx) => (
            <CitationCard key={idx} url={citation.url} title={citation.title} index={idx + 1} />
          ))}
        </div>
      )}
    </div>
  );
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
    <Alert
      type="warning"
      variant="outlined"
      message={`Approval needed — ${humanizeToolName(toolName)}`}
      extra={
        <>
          <Highlighter language="bash" copyable variant="filled">{command}</Highlighter>
          {reason && <div className="mt-2 font-sans text-xs text-warning">{reason}</div>}
        </>
      }
      extraDefaultExpand
    />
  );
}

export function FeedItem({
  entry,
  inTimeline = false,
  modelIconOverrides,
  onApproval,
}: {
  entry: FeedEntry;
  inTimeline?: boolean;
  modelIconOverrides?: ModelIconOverrides;
  onApproval?: (taskId: string, approved: boolean) => Promise<void>;
}) {
  switch (entry.kind) {
    case 'prompt':
      return <UserBubble text={entry.text} />;
    case 'system_status':
      return <span className="font-sans text-sm text-muted">{entry.text}</span>;
    case 'task_group':
      return <FeedTaskGroup tasks={entry.tasks} modelIconOverrides={modelIconOverrides} />;
    case 'tool_call':
      return <FeedToolCall toolName={entry.toolName} input={entry.input} output={entry.output} status={entry.status} showLeadingIcon={!inTimeline} />;
    case 'bash_approval':
      if (onApproval && entry.taskId) {
        return (
          <ApprovalGate
            taskId={entry.taskId}
            toolName={entry.toolName}
            command={entry.command}
            reason={entry.reason}
            status={entry.status}
            onApprove={(id) => void onApproval(id, true)}
            onReject={(id) => void onApproval(id, false)}
          />
        );
      }
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

