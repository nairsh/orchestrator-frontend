import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Loader2, ChevronDown } from 'lucide-react';
import type { ApiConfig } from '../../api/client';
import { getModels } from '../../api/client';
import { ModelDropdown } from '../dropdowns/ModelDropdown';
import { streamAgentResponse } from '../../api/sse';
import { toastApiError } from '../../lib/toast';
import { Markdown } from '../markdown/Markdown';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type ToolCall = { name: string; input: unknown; output?: unknown; status: 'running' | 'completed' | 'failed' };
type TimelineItem = 
  | { type: 'message'; role: 'user' | 'assistant'; content: string }
  | { type: 'tool'; tool: ToolCall };

const MESSAGE_TRUNCATE_LENGTH = 200;
const MESSAGE_MAX_LINES = 4;

function MessageBubble({ content, role }: { content: string; role: 'user' | 'assistant' }) {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = content.length > MESSAGE_TRUNCATE_LENGTH;
  const displayContent = shouldTruncate && !expanded
    ? content.slice(0, MESSAGE_TRUNCATE_LENGTH) + '...'
    : content;

  return (
    <div
      style={{
        width: 'fit-content',
        maxWidth: '85%',
        borderRadius: 18,
        background: '#F2F2F2',
        padding: '14px 18px',
        fontFamily: role === 'assistant' ? '"Styrene A Web", Inter, sans-serif' : 'Inter, sans-serif',
        color: '#111111',
        position: 'relative',
      }}
    >
      <div
        style={{
          maxHeight: expanded ? undefined : `${MESSAGE_MAX_LINES * 1.5}em`,
          overflow: expanded ? undefined : 'hidden',
          position: 'relative',
        }}
      >
        <Markdown content={displayContent} />
        {shouldTruncate && !expanded && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '40px',
              background: 'linear-gradient(transparent, #F2F2F2)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
      {shouldTruncate && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          style={{
            marginTop: 8,
            background: 'none',
            border: 'none',
            padding: 0,
            fontFamily: 'Inter',
            fontSize: 13,
            color: '#666666',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {expanded ? 'Show less' : 'Show more'}
          <ChevronDown
            size={14}
            style={{
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease',
            }}
          />
        </button>
      )}
    </div>
  );
}

function ToolCallItem({ tool }: { tool: ToolCall }) {
  const getIcon = () => {
    if (tool.name.includes('search') || tool.name.includes('fetch')) return '🔍';
    if (tool.name.includes('file')) return '📄';
    if (tool.name.includes('bash') || tool.name.includes('command')) return '⚡';
    return '🔧';
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        borderRadius: 12,
        background: '#FFFFFF',
        border: '1px solid #E0E0E0',
        fontFamily: 'Inter',
        fontSize: 13,
        color: '#666666',
      }}
    >
      <span>{getIcon()}</span>
      <span>{tool.name}</span>
      {tool.status === 'running' && (
        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#3B82F6', marginLeft: 'auto' }} />
      )}
    </div>
  );
}

function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const isFirst = idx === 0;
        
        return (
          <div key={idx} style={{ display: 'flex', gap: 16 }}>
            {/* Timeline line and node */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
              {/* Top line */}
              {!isFirst && (
                <div style={{ width: 2, flex: 1, background: '#E0E0E0' }} />
              )}
              {isFirst && <div style={{ flex: 1 }} />}
              
              {/* Node */}
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: item.type === 'message' 
                    ? (item.role === 'user' ? '#111111' : '#3B82F6')
                    : '#F59E0B',
                  flexShrink: 0,
                  margin: '8px 0',
                }}
              />
              
              {/* Bottom line */}
              {!isLast && (
                <div style={{ width: 2, flex: 1, background: '#E0E0E0' }} />
              )}
              {isLast && <div style={{ flex: 1 }} />}
            </div>
            
            {/* Content */}
            <div style={{ flex: 1, paddingBottom: 16, paddingTop: isFirst ? 0 : 0 }}>
              {item.type === 'message' ? (
                <div style={{ display: 'flex', justifyContent: item.role === 'user' ? 'flex-end' : 'flex-start' }}>
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

interface ChatModalProps {
  config: ApiConfig;
  onClose: () => void;
  fullscreen?: boolean;
}

export function ChatModal({ config, onClose, fullscreen = false }: ChatModalProps) {
  const [visible, setVisible] = useState(false);
  const [model, setModel] = useState<string>('openai/gpt-4o');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [draftAssistant, setDraftAssistant] = useState('');
  const assistantBufferRef = useRef('');
  const abortRef = useRef<{ close: () => void } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getModels(config)
      .then((res) => {
        if (cancelled) return;
        const ids = new Set(res.models.map((m) => m.id));
        const preferred =
          (res.default_orchestrator_model && ids.has(res.default_orchestrator_model)
            ? res.default_orchestrator_model
            : res.models[0]?.id) ?? model;
        if (!ids.has(model) && preferred) {
          setModel(preferred);
        }
      })
      .catch(() => {
        // ignore; dropdown will show whatever it can
      });
    return () => {
      cancelled = true;
    };
  }, [config.baseUrl]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, draftAssistant.length]);

  const handleClose = () => {
    abortRef.current?.close();
    abortRef.current = null;
    setVisible(false);
    setTimeout(onClose, 150);
  };

  const canSend = useMemo(() => input.trim().length > 0 && !streaming, [input, streaming]);

  const send = () => {
    const text = input.trim();
    if (!text || streaming) return;
    if (!config.apiKey) {
      toastApiError(new Error('Missing API key'), 'Not connected');
      return;
    }

    setInput('');
    setStreaming(true);
    assistantBufferRef.current = '';
    setDraftAssistant('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);

    abortRef.current?.close();
    abortRef.current = streamAgentResponse(
      config.baseUrl,
      config.apiKey,
      {
        model,
        input: text,
      },
      (chunk) => {
        if (chunk.type === 'text_delta' && chunk.text) {
          assistantBufferRef.current += chunk.text;
          setDraftAssistant(assistantBufferRef.current);
          return;
        }

        if (chunk.type === 'done') {
          setStreaming(false);
          const finalText = assistantBufferRef.current;
          if (finalText) {
            setMessages((prev) => [...prev, { role: 'assistant', content: finalText }]);
          }
          assistantBufferRef.current = '';
          setDraftAssistant('');
          abortRef.current?.close();
          abortRef.current = null;
          return;
        }

        if (chunk.type === 'error') {
          setStreaming(false);
          const message =
            chunk.data && typeof chunk.data === 'object' && 'message' in (chunk.data as Record<string, unknown>)
              ? String((chunk.data as { message?: unknown }).message ?? 'Unknown error')
              : 'Unknown error';
          toastApiError(new Error(message), 'Agent error');
          assistantBufferRef.current = '';
          setDraftAssistant('');
          abortRef.current?.close();
          abortRef.current = null;
        }
      },
      (err) => {
        setStreaming(false);
        toastApiError(err, 'Stream error');
        assistantBufferRef.current = '';
        setDraftAssistant('');
        abortRef.current?.close();
        abortRef.current = null;
      }
    );
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (fullscreen) {
    return (
      <div
        className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-150 chat-ui ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ background: '#FFFFFF' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center" style={{ gap: 12 }}>
            <h2 className="text-sm font-semibold text-primary">Agent chat</h2>
            <ModelDropdown config={config} selected={model} onSelect={setModel} variant="all" />
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-primary hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ padding: 20, background: '#faf8f4' }}>
          <div className="flex flex-col w-full max-w-3xl mx-auto">
            {messages.length > 0 && (
              <Timeline 
                items={messages.map(m => ({ type: 'message' as const, role: m.role, content: m.content }))} 
              />
            )}

            {draftAssistant && (
              <Timeline 
                items={[{ type: 'message', role: 'assistant', content: draftAssistant }]} 
              />
            )}

            {streaming && !draftAssistant && (
              <div className="flex items-center" style={{ gap: 8, color: '#666666', fontFamily: 'Inter', fontSize: 13, marginLeft: 40 }}>
                <Loader2 size={14} className="animate-spin" />
                Thinking…
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-gray-100 flex-shrink-0" style={{ padding: 16, background: '#FFFFFF' }}>
          <div
            className="flex items-end gap-2 bg-white rounded-xl border border-gray-200 shadow-sm px-3 py-2"
            style={{ maxWidth: 760, margin: '0 auto' }}
          >
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                const el = e.target;
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Message the agent…"
              className="flex-1 resize-none bg-transparent text-sm text-primary placeholder:text-muted outline-none leading-relaxed"
              style={{ minHeight: 24, maxHeight: 140, fontFamily: 'Inter' }}
            />
            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center transition-opacity disabled:opacity-30 flex-shrink-0"
              aria-label="Send"
            >
              <ArrowUpIcon />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-all duration-150 chat-ui ${
        visible ? 'bg-black/40' : 'bg-black/0'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden transition-all duration-150 chat-ui ${
          visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-[0.98]'
        }`}
        style={{ maxHeight: 'min(80vh, 720px)', display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center" style={{ gap: 12 }}>
            <h2 className="text-sm font-semibold text-primary">Agent chat</h2>
            <ModelDropdown config={config} selected={model} onSelect={setModel} variant="all" />
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-primary hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ padding: 20, background: '#faf8f4' }}>
          <div className="flex flex-col">
            {messages.length > 0 && (
              <Timeline 
                items={messages.map(m => ({ type: 'message' as const, role: m.role, content: m.content }))} 
              />
            )}

            {draftAssistant && (
              <Timeline 
                items={[{ type: 'message', role: 'assistant', content: draftAssistant }]} 
              />
            )}

            {streaming && !draftAssistant && (
              <div className="flex items-center" style={{ gap: 8, color: '#666666', fontFamily: 'Inter', fontSize: 13, marginLeft: 40 }}>
                <Loader2 size={14} className="animate-spin" />
                Thinking…
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-gray-100" style={{ padding: 16, background: '#FFFFFF' }}>
          <div
            className="flex items-end gap-2 bg-white rounded-xl border border-gray-200 shadow-sm px-3 py-2"
            style={{ maxWidth: 760, margin: '0 auto' }}
          >
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                const el = e.target;
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Message the agent…"
              className="flex-1 resize-none bg-transparent text-sm text-primary placeholder:text-muted outline-none leading-relaxed"
              style={{ minHeight: 24, maxHeight: 140, fontFamily: 'Inter' }}
            />
            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center transition-opacity disabled:opacity-30 flex-shrink-0"
              aria-label="Send"
            >
              <ArrowUpIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 19V5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 12L12 5L19 12"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
