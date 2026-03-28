import { memo, useState } from 'react';
import { Alert, Highlighter } from '@lobehub/ui';
import { ChevronDown } from 'lucide-react';
import type { FeedEntry } from '../../api/types';
import { Markdown } from '../markdown/Markdown';
import { CitationCard } from '../CitationCard';
import { CopyButton } from '../ui/CopyButton';
import { humanizeErrorDescription } from '../../lib/humanizeError';
import { humanizeToolName } from '../../lib/toolLabels';
import { FeedTaskGroup } from './feed/FeedTaskGroup';
import { FeedToolCall } from './feed/FeedToolCall';
import { parseCitationsFromText } from './feed/feedHelpers';
import { ApprovalGate } from '../ApprovalGate';

const USER_BUBBLE_TRUNCATE_CHARS = 600;

function UserBubble({ text, fullView = false }: { text: string; fullView?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = text.length > USER_BUBBLE_TRUNCATE_CHARS;
  const displayText = shouldTruncate && !expanded ? `${text.slice(0, USER_BUBBLE_TRUNCATE_CHARS)}…` : text;

  return (
    <div className="w-full flex justify-end">
      <div className={`inline-flex flex-col rounded-2xl px-3.5 py-2.5 max-w-[72%] min-h-[38px] ${fullView ? 'bg-surface-hover border border-border-subtle/50' : 'bg-userbubble border border-border-subtle/40 shadow-[0_1px_0_rgba(0,0,0,0.03)]'}`}>
        <span className="font-sans text-md leading-relaxed text-primary whitespace-pre-wrap break-all">
          {displayText}
        </span>
        {shouldTruncate && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-1 flex items-center gap-0.5 text-xs text-muted hover:text-primary bg-transparent border-none p-0 cursor-pointer font-sans self-start"
            aria-expanded={expanded}
          >
            {expanded ? 'Show less' : 'Show more'}
            <ChevronDown size={12} className="transition-transform duration-slow" style={{ transform: expanded ? 'rotate(180deg)' : 'none' }} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Shared markdown + citation block used by AiMessage and CompletionBlock ─── */

function MarkdownWithCitations({ content }: { content: string }) {
  const citations = parseCitationsFromText(content);
  return (
    <div className="group/msg relative">
      <div className="absolute -top-1 right-0 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-200">
        <CopyButton text={content} />
      </div>
      <Markdown content={content} />
      {citations.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {citations.map((citation, idx) => (
            <CitationCard key={`${citation.url}-${idx}`} url={citation.url} title={citation.title} index={idx + 1} />
          ))}
        </div>
      )}
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
        description={humanizeErrorDescription(text.replace(/^workflow failed:\s*/i, ''))}
      />
    );
  }
  return <MarkdownWithCitations content={text} />;
}

function CompletionBlock({ output }: { output?: string }) {
  if (!output) return null;
  return <MarkdownWithCitations content={output} />;
}

function BashApprovalBlock({
  toolName,
  command,
  reason,
}: {
  toolName: string;
  command: string;
  reason?: string;
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

interface FeedItemProps {
  entry: FeedEntry;
  onBashApproval?: (approvalId: string, approved: boolean) => Promise<void>;
  fullView?: boolean;
}

export const FeedItem = memo(function FeedItem({
  entry,
  onBashApproval,
  fullView = false,
}: FeedItemProps) {
  switch (entry.kind) {
    case 'prompt':
      return <UserBubble text={entry.text} fullView={fullView} />;
    case 'system_status':
      return <span className="font-sans text-sm text-muted">{entry.text}</span>;
    case 'task_group':
      return <FeedTaskGroup tasks={entry.tasks} />;
    case 'tool_call':
      return <FeedToolCall toolName={entry.toolName} input={entry.input} output={entry.output} status={entry.status} at={entry.at} />;
    case 'bash_approval':
      if (onBashApproval && entry.id) {
        return (
          <ApprovalGate
            approvalId={entry.id}
            toolName={entry.toolName}
            command={entry.command}
            reason={entry.reason}
            status={entry.status}
            onApprove={(id) => onBashApproval(id, true)}
            onReject={(id) => onBashApproval(id, false)}
          />
        );
      }
      return <BashApprovalBlock toolName={entry.toolName} command={entry.command} reason={entry.reason} />;
    case 'user_message':
      return <UserBubble text={entry.text} fullView={fullView} />;
    case 'ai_message':
      return <AiMessage text={entry.text} />;
    case 'planning':
      return null;
    case 'completion':
      return <CompletionBlock output={entry.output} />;
    default:
      return null;
  }
});
