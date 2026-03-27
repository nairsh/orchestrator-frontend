import { useState, type ReactNode } from 'react';
import { ChevronDown, Loader2, ArrowUp, X } from 'lucide-react';
import { CopyButton, Tooltip } from '@lobehub/ui';
import { Markdown } from '../markdown/Markdown';
import type { ChatMessage } from '../../hooks/useChatStream';
import { IconButton, Textarea } from '../ui';

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
const MESSAGE_MAX_LINES = 4;

/* ─── MessageBubble ─── */

export function MessageBubble({ content, role }: { content: string; role: 'user' | 'assistant' }) {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = content.length > MESSAGE_TRUNCATE_LENGTH;
  const displayContent = shouldTruncate && !expanded
    ? content.slice(0, MESSAGE_TRUNCATE_LENGTH) + '…'
    : content;

  return (
    <div className={`w-fit max-w-[85%] rounded-2xl px-4.5 py-3.5 text-primary relative group ${role === 'user' ? 'bg-surface-secondary' : 'bg-surface-tertiary'}`}>
      <div
        className={`font-sans`}
        style={{
          maxHeight: expanded ? undefined : `${MESSAGE_MAX_LINES * 1.5}em`,
          overflow: expanded ? undefined : 'hidden',
          position: 'relative',
        }}
      >
        <Markdown content={displayContent} />
        {shouldTruncate && !expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-surface-tertiary to-transparent pointer-events-none" />
        )}
      </div>
      {role === 'assistant' && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <CopyButton content={content} size="small" />
        </div>
      )}
      {shouldTruncate && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-sm text-muted hover:text-primary cursor-pointer bg-transparent border-none p-0 font-sans"
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
      <span>{tool.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</span>
      {tool.status === 'running' && (
        <div className="w-1.5 h-1.5 rounded-full bg-info animate-pulse ml-auto" />
      )}
    </div>
  );
}

/* ─── Timeline ─── */

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="flex flex-col">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const isFirst = idx === 0;

        const dotColor =
          item.type === 'message'
            ? item.role === 'user' ? 'bg-ink' : 'bg-info'
            : 'bg-warning';

        return (
          <div key={idx} className="flex gap-4">
            {/* Timeline line and node */}
            <div className="flex flex-col items-center w-6 flex-shrink-0">
              {!isFirst ? <div className="w-0.5 flex-1 bg-border-subtle" /> : <div className="flex-1" />}
              <div className={`w-2.5 h-2.5 rounded-full ${dotColor} flex-shrink-0 my-2`} />
              {!isLast ? <div className="w-0.5 flex-1 bg-border-subtle" /> : <div className="flex-1" />}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              {item.type === 'message' ? (
                <div className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <MessageBubble content={item.content} role={item.role} />
                </div>
              ) : (
                <ToolCallItem tool={item.tool} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── StreamingIndicator ─── */

export function StreamingIndicator() {
  return (
    <div className="flex items-center gap-2 text-muted font-sans text-sm ml-10">
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
  return (
    <div className="flex-1 overflow-y-auto p-5 bg-surface-warm">
      <div className={`flex flex-col w-full ${maxWidth} mx-auto`}>
        {messages.length > 0 && (
          <Timeline items={messages.map((m) => ({ type: 'message' as const, role: m.role, content: m.content }))} />
        )}
        {draftAssistant && (
          <div className="fade-in-soft">
            <Timeline items={[{ type: 'message', role: 'assistant', content: draftAssistant }]} />
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
        className="flex items-end gap-2 rounded-xl border border-border-light shadow-xs px-3 py-2 max-w-chat mx-auto bg-surface"
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
}

export function ChatHeader({ title = 'AI Chat', onClose, children, tone = 'surface' }: ChatHeaderProps) {
  return (
    <div className={`flex items-center justify-between px-5 py-4 border-b border-border-light flex-shrink-0 ${tone === 'warm' ? 'bg-surface-warm' : 'bg-surface'}`}>
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-primary">{title}</h2>
        {children}
      </div>
      <IconButton onClick={onClose} size="md" label="Close">
        <X size={16} />
      </IconButton>
    </div>
  );
}
