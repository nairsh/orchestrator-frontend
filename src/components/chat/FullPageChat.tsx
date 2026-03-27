import { useEffect, useRef, useState } from 'react';
import type { ApiConfig } from '../../api/client';
import { getModels } from '../../api/client';
import { ModelDropdown } from '../dropdowns/ModelDropdown';
import { useChatStream } from '../../hooks/useChatStream';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { ChatHeader, ChatMessageArea, ChatInput } from './ChatPrimitives';
import type { ModelIconOverrides } from '../../lib/modelIcons';

interface FullPageChatProps {
  config: ApiConfig;
  initialMessage?: string;
  onClose: () => void;
  modelIconOverrides?: ModelIconOverrides;
}

export function FullPageChat({ config, initialMessage, onClose, modelIconOverrides }: FullPageChatProps) {
  const [model, setModel] = useState<string>('openai/gpt-4o');
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialMessageSentRef = useRef(false);
  const { messages, streaming, draftAssistant, canSend, send, abort } = useChatStream({ config, model });

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
        // Model list unavailable — keep current selection
      });
    return () => { cancelled = true; };
  }, [config.baseUrl]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, draftAssistant.length]);

  // Send initial message if provided
  useEffect(() => {
    if (initialMessage && !initialMessageSentRef.current) {
      initialMessageSentRef.current = true;
      send(initialMessage);
    }
  }, [initialMessage]);

  const handleClose = () => {
    abort();
    onClose();
  };

  useEscapeKey(handleClose);

  const handleSend = () => {
    const text = input.trim();
    if (text) {
      setInput('');
      send(text);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden chat-ui bg-surface-warm">
      <ChatHeader title="AI Chat" onClose={handleClose} tone="warm">
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
        tone="warm"
      />
    </div>
  );
}
