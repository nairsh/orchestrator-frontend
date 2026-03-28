import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { ApiConfig } from '../../api/client';
import { ModelDropdown } from '../dropdowns/ModelDropdown';
import { useChatStream } from '../../hooks/useChatStream';
import { useChatModel } from '../../hooks/useChatModel';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { ChatHeader, ChatMessageArea, ChatInput } from './ChatPrimitives';
import type { ModelIconOverrides } from '../../lib/modelIcons';

interface ChatModalProps {
  config: ApiConfig;
  onClose: () => void;
  fullscreen?: boolean;
  modelIconOverrides?: ModelIconOverrides;
}

export function ChatModal({ config, onClose, fullscreen = false, modelIconOverrides }: ChatModalProps) {
  const [visible, setVisible] = useState(false);
  const [model, setModel] = useChatModel(config);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const { messages, streaming, draftAssistant, canSend, send, abort, clearHistory } = useChatStream({ config, model });

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, draftAssistant.length]);

  const handleClose = () => {
    abort();
    if (fullscreen) {
      onClose();
    } else {
      setVisible(false);
      setTimeout(onClose, 150);
    }
  };

  useEscapeKey(handleClose);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    if (send(text)) setInput('');
  };

  const chatContent = (
    <>
      <ChatHeader title="AI Chat" onClose={handleClose} tone={fullscreen ? 'warm' : 'surface'} variant={fullscreen ? 'fullscreen' : 'modal'}>
        <div className="flex items-center gap-1.5">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              disabled={streaming}
              title="New chat"
              className="flex items-center justify-center h-7 w-7 rounded-lg text-muted hover:text-primary hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw size={14} />
            </button>
          )}
          <ModelDropdown
            config={config}
            selected={model}
            onSelect={setModel}
            variant="all"
            modelIconOverrides={modelIconOverrides}
          />
        </div>
      </ChatHeader>

      <ChatMessageArea
        messages={messages}
        draftAssistant={draftAssistant}
        streaming={streaming}
        bottomRef={bottomRef as React.RefObject<HTMLDivElement>}
        onSuggestion={(text) => {
          setInput('');
          send(text);
        }}
      />

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        canSend={canSend(input)}
        tone={fullscreen ? 'warm' : 'surface'}
        streaming={streaming}
        onAbort={abort}
      />
    </>
  );

  if (fullscreen) {
    return (
      <div
        className={`flex-1 flex flex-col h-full overflow-hidden chat-ui bg-surface-warm transition-all duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {chatContent}
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-all duration-200 chat-ui ${
        visible ? 'bg-black/30 backdrop-blur-sm' : 'bg-black/0'
      }`}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI Chat"
        className={`bg-surface rounded-2xl shadow-modal w-full max-w-2xl overflow-hidden transition-all duration-200 chat-ui flex flex-col max-h-[min(80vh,720px)] ${
          visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-[0.98]'
        }`}
      >
        {chatContent}
      </div>
    </div>
  );
}
