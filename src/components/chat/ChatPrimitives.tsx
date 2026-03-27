import { useState, type ReactNode } from 'react';
import { ChevronDown, Loader2, ArrowUp, ArrowLeft, X } from 'lucide-react';
import { CopyButton } from '@lobehub/ui';
import { Markdown } from '../markdown/Markdown';
import type { ChatMessage } from '../../hooks/useChatStream';
import { IconButton, Textarea } from '../ui';
import { humanizeToolName } from '../../lib/toolLabels';

/* ─── Types ─── */

export type ToolCall = {
  name: string;
  input: unknown;
  output?: unknown;
  status: 'running' | 'completed' | 'failed';
};

export type TimelineItem =
  | { type: 'message'; role: 'user' | 'assistant'; content: string }
  | { type: 'tool'; tool: ToolCall };

/* ─── Constants ─── */

const MESSAGE_TRUNCATE_LENGTH = 200;

/* ─── UserBubble ─── */

export function UserBubble({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = content.length > MESSAGE_TRUNCATE_LENGTH;
  const displayContent = shouldTruncate && !expanded
    ? content.slice(0, MESSAGE_TRUNCATE_LENGTH) + '…'
    : content;

  return (
    <div className="w-fit max-w-[85%] rounded-2xl px-4.5 py-3.5 text-primary bg-userbubble">
      <p className="font-sans text-sm leading-relaxed whitespace-pre-wrap">{displayContent}</p>
      {shouldTruncate && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-sm text-muted hover:text-primary cursor-pointer bg-transparent border-none p-0 font-sans"
          aria-expanded={expanded}
        >
          {expanded ? 'Show less' : 'Show more'}
          <ChevronDown
            size={14}
            className="transition-transform duration-slow"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
          />
        </button>
      )}
    </div>
  );
}

/* ─── AssistantMessage ─── */

export function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="relative group max-w-[85%]">
      <div className="font-sans text-sm leading-relaxed text-primary">
        <Markdown content={content} />
      </div>
      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 -translate-y-1 translate-x-8">
        <CopyButton content={content} size="small" />
      </div>
    </div>
  );
}

/* ─── ToolCallItem ─── */

export function ToolCallItem({ tool }: { tool: ToolCall }) {
  const getIcon = () => {
    if (tool.name.includes('search') || tool.name.includes('fetch')) return '\u{1F50D}';
    if (tool.name.includes('file')) return '\u{1F4C4}';
    if (tool.name.includes('bash') || tool.name.includes('command')) return '\u26A1';
    return '\u{1F527}';
  };

  return (
    <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface border border-border-light font-sans text-sm text-muted">
      <span>{getIcon()}</span>
      <span>{humanizeToolName(tool.name)}</span>
      {tool.status === 'running' && (
        <div className="w-1.5 h-1.5 rounded-full bg-info animate-pulse ml-auto" />
      )}
    </div>
  );
}

/* ─── MessageList (flat, no timeline rail) ─── */

export function MessageList({ items }: { items: TimelineItem[] }) {
  return (
    <div className="flex flex-col gap-6">
      {items.map((item, idx) => (
        <div key={idx}>
          {item.type === 'message' ? (
            <div className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {item.role === 'user' ? (
                <UserBubble content={item.content} />
              ) : (
                <AssistantMessage content={item.content} />
              )}
            </div>
          ) : (
            <ToolCallItem tool={item.tool} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── StreamingIndicator ─── */

export function StreamingIndicator() {
  return (
    <div className="flex items-center gap-2 text-muted font-sans text-sm mt-6">
      <Loader2 size={14} className="animate-spin" />
      Thinking…
    </div>
  );
}

/* ─── ChatMessageArea ─── */

interface ChatMessageAreaProps {
  messages: ChatMessage[];
  draftAssistant: string;
  streaming: boolean;
  maxWidth?: string;
  bottomRef: React.RefObject<HTMLDivElement>;
}

export function ChatMessageArea({ messages, draftAssistant, streaming, maxWidth = 'max-w-3xl', bottomRef }: ChatMessageAreaProps) {
  const isEmpty = messages.length === 0 && !draftAssistant && !streaming;

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-surface-warm">
      <div className={`flex flex-col w-full ${maxWidth} mx-auto`}>
        {isEmpty && (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center mb-4 border border-border-light">
              <span className="text-xl">💬</span>
            </div>
            <h3 className="text-base font-semibold text-primary font-sans mb-1">Start a conversation</h3>
            <p className="text-sm text-muted font-sans max-w-xs">Ask anything — get answers, brainstorm ideas, or work through problems together.</p>
          </div>
        )}
        {messages.length > 0 && (
          <MessageList items={messages.map((m) => ({ type: 'message' as const, role: m.role, content: m.content }))} />
        )}
        {draftAssistant && (
          <div className="fade-in-soft mt-6">
            <AssistantMessage content={draftAssistant} />
          </div>
        )}
        {streaming && !draftAssistant && <StreamingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

/* ─── ChatInput ─── */

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  canSend: boolean;
  placeholder?: string;
  tone?: 'surface' | 'warm';
}

export function ChatInput({
  value,
  onChange,
  onSend,
  canSend,
  placeholder = 'Send a message…',
  tone = 'surface',
}: ChatInputProps) {

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className={`border-t border-border-light flex-shrink-0 p-4 ${tone === 'warm' ? 'bg-surface-warm' : 'bg-surface'}`}>
      <div
        className="flex items-end gap-2 rounded-xl border border-border-light shadow-xs px-3 py-2 max-w-chat mx-auto bg-surface focus-within:border-border focus-within:shadow-sm transition-all duration-200"
      >
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxHeight={140}
          className="flex-1 text-sm leading-relaxed"
        />
        <IconButton
          onClick={onSend}
          disabled={!canSend}
          filled
          size="md"
          label="Send"
          className="w-7 h-7 bg-primary text-surface"
        >
          <ArrowUp size={14} className="text-surface" />
        </IconButton>
      </div>
    </div>
  );
}

/* ─── ChatHeader ─── */

interface ChatHeaderProps {
  title?: string;
  onClose: () => void;
  children?: ReactNode;
  tone?: 'surface' | 'warm';
  variant?: 'modal' | 'fullscreen';
}

export function ChatHeader({ title = 'AI Chat', onClose, children, tone = 'surface', variant = 'modal' }: ChatHeaderProps) {
  return (
    <div className={`flex items-center justify-between px-5 py-3 border-b border-border-light flex-shrink-0 ${tone === 'warm' ? 'bg-surface-warm' : 'bg-surface'}`}>
      <div className="flex items-center gap-3 min-w-0">
        <IconButton onClick={onClose} size="md" label={variant === 'fullscreen' ? 'Back' : 'Close'}>
          {variant === 'fullscreen' ? <ArrowLeft size={18} /> : <X size={16} />}
        </IconButton>
        <h2 className="text-sm font-semibold text-primary truncate">{title}</h2>
        {children}
      </div>
    </div>
  );
}
