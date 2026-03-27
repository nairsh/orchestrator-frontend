import { useEffect, useRef, useState } from 'react';
import type { ApiConfig } from '../../api/client';
import { getModels } from '../../api/client';
import { ModelDropdown } from '../dropdowns/ModelDropdown';
import { Modal } from '../ui/Modal';
import { useChatStream } from '../../hooks/useChatStream';
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
  const [model, setModel] = useState<string>('openai/gpt-4o');
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const { messages, streaming, draftAssistant, canSend, send, abort } = useChatStream({ config, model });

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
      .catch(() => {});
    return () => { cancelled = true; };
  }, [config.baseUrl]);

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
    setInput('');
    send(text);
  };

  const chatContent = (
    <>
      <ChatHeader title="AI Chat" onClose={handleClose} tone={fullscreen ? 'warm' : 'surface'}>
        <ModelDropdown
          config={config}
          selected={model}
          onSelect={setModel}
          variant="all"
          modelIconOverrides={modelIconOverrides}
        />
      </ChatHeader>

      <ChatMessageArea
        messages={messages}
        draftAssistant={draftAssistant}
        streaming={streaming}
        bottomRef={bottomRef as React.RefObject<HTMLDivElement>}
      />

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        canSend={canSend(input)}
        tone={fullscreen ? 'warm' : 'surface'}
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
        visible ? 'bg-black/30' : 'bg-black/0'
      }`}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className={`bg-surface rounded-2xl shadow-modal w-full max-w-2xl overflow-hidden transition-all duration-200 chat-ui flex flex-col max-h-[min(80vh,720px)] ${
          visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-[0.98]'
        }`}
      >
        {chatContent}
      </div>
    </div>
  );
}
