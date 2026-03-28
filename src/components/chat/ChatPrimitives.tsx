import { useState, useRef, useEffect, useLayoutEffect, type ReactNode } from 'react';
import { ChevronDown, Loader2, ArrowUp, ArrowLeft, X, Square, AlertCircle, RotateCcw } from 'lucide-react';
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

function formatTime(ts?: number): string {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ─── UserBubble ─── */

export function UserBubble({ content, timestamp }: { content: string; timestamp?: number }) {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = content.length > MESSAGE_TRUNCATE_LENGTH;
  const displayContent = shouldTruncate && !expanded
    ? content.slice(0, MESSAGE_TRUNCATE_LENGTH) + '…'
    : content;

  return (
    <div className="flex flex-col items-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-3 text-primary bg-userbubble">
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
      {timestamp ? <div className="text-[10px] text-muted/60 font-sans mt-1 mr-1">{formatTime(timestamp)}</div> : null}
    </div>
  );
}

/* ─── AssistantMessage ─── */

export function AssistantMessage({ content, timestamp }: { content: string; timestamp?: number }) {
  return (
    <div className="flex flex-col items-start">
      <div className="relative group max-w-[90%]">
        <div className="font-sans text-sm leading-relaxed text-primary">
          <Markdown content={content} />
        </div>
        <div className="flex items-center gap-2 mt-1">
          {timestamp ? <span className="text-[10px] text-muted/60 font-sans">{formatTime(timestamp)}</span> : null}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <CopyButton content={content} size="small" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── ErrorMessage ─── */

export function ErrorMessage({ content, timestamp, onRetry }: { content: string; timestamp?: number; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start">
      <div className="max-w-[90%]">
        <div className="rounded-xl px-4 py-3 bg-danger/5 border border-danger/10">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="text-danger flex-shrink-0 mt-0.5" />
            <p className="font-sans text-sm text-danger leading-relaxed">{content}</p>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 flex items-center gap-1.5 text-xs text-danger/80 hover:text-danger cursor-pointer bg-transparent border-none p-0 font-sans transition-colors ml-5"
            >
              <RotateCcw size={11} />
              Retry
            </button>
          )}
        </div>
        {timestamp ? <div className="text-[10px] text-muted/60 font-sans mt-1">{formatTime(timestamp)}</div> : null}
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

export function MessageList({ items }: { items: (TimelineItem & { timestamp?: number; error?: boolean })[] }) {
  return (
    <div className="flex flex-col gap-6">
      {items.map((item, idx) => {
        const key = item.timestamp
          ? `${item.type}-${item.type === 'message' ? item.role : 'tool'}-${item.timestamp}`
          : `${item.type}-${idx}`;
        return (
        <div key={key}>
          {item.type === 'message' ? (
            <div className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {item.error ? (
                <ErrorMessage content={item.content} timestamp={item.timestamp} />
              ) : item.role === 'user' ? (
                <UserBubble content={item.content} timestamp={item.timestamp} />
              ) : (
                <AssistantMessage content={item.content} timestamp={item.timestamp} />
              )}
            </div>
          ) : (
            <ToolCallItem tool={item.tool} />
          )}
        </div>
        );
      })}
    </div>
  );
}

/* ─── StreamingIndicator ─── */

export function StreamingIndicator() {
  return (
    <div className="flex items-center gap-2 text-muted font-sans text-sm mt-6">
      <Loader2 size={14} className="animate-spin" />
      <span>Thinking…</span>
    </div>
  );
}

/* ─── Suggestion chips for empty state ─── */

const CHAT_SUGGESTIONS = [
  'Summarize a topic for me',
  'Help me brainstorm ideas',
  'Explain a concept simply',
  'Write a short draft',
];

/* ─── ChatMessageArea ─── */

interface ChatMessageAreaProps {
  messages: ChatMessage[];
  draftAssistant: string;
  streaming: boolean;
  maxWidth?: string;
  bottomRef: React.RefObject<HTMLDivElement>;
  onSuggestion?: (text: string) => void;
}

export function ChatMessageArea({ messages, draftAssistant, streaming, maxWidth = 'max-w-3xl', bottomRef, onSuggestion }: ChatMessageAreaProps) {
  const isEmpty = messages.length === 0 && !draftAssistant && !streaming;

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-surface-warm" role="log" aria-label="Chat messages" aria-live="polite">
      <div className={`flex flex-col w-full ${maxWidth} mx-auto`}>
        {isEmpty && (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center mb-4 border border-border-light">
              <span className="text-xl">💬</span>
            </div>
            <h3 className="text-base font-semibold text-primary font-sans mb-1">Start a conversation</h3>
            <p className="text-sm text-muted font-sans max-w-xs mb-6">Ask anything — get answers, brainstorm ideas, or work through problems together.</p>
            {onSuggestion && (
              <div className="flex flex-wrap justify-center gap-2 max-w-sm">
                {CHAT_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onSuggestion(s)}
                    className="px-3 py-1.5 rounded-full text-xs font-sans text-muted hover:text-primary bg-surface border border-border-light hover:border-border hover:bg-surface-hover transition-all duration-200 cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {messages.length > 0 && (
          <MessageList items={messages.map((m) => ({ type: 'message' as const, role: m.role, content: m.content, timestamp: m.timestamp, error: m.error }))} />
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
  streaming?: boolean;
  onAbort?: () => void;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  canSend,
  placeholder = 'Send a message…',
  tone = 'surface',
  streaming = false,
  onAbort,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount — useLayoutEffect fires before paint so no flash of unfocused state
  useLayoutEffect(() => {
    textareaRef.current?.focus();
  }, []);

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
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxHeight={140}
          className="flex-1 text-sm leading-relaxed"
          aria-label="Chat message input"
        />
        {streaming ? (
          <IconButton
            onClick={onAbort}
            size="md"
            label="Stop generating"
            className="w-7 h-7 bg-danger/10 text-danger hover:bg-danger/20"
          >
            <Square size={12} fill="currentColor" />
          </IconButton>
        ) : (
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
        )}
      </div>
      <p className="text-[10px] text-muted/60 font-sans text-center mt-1.5">
        <kbd className="font-mono">Enter</kbd> to send · <kbd className="font-mono">Shift+Enter</kbd> for new line
      </p>
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
