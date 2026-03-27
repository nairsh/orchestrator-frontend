import { useEffect, useRef, useState } from 'react';
import type { ApiConfig } from '../../api/client';
import { ModelDropdown } from '../dropdowns/ModelDropdown';
import { useChatStream } from '../../hooks/useChatStream';
import { useChatModel } from '../../hooks/useChatModel';
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
  const [model, setModel] = useChatModel(config);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialMessageSentRef = useRef(false);
  const { messages, streaming, draftAssistant, canSend, send, abort } = useChatStream({ config, model });

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
