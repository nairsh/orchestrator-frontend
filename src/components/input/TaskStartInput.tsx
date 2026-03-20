import { useState, useRef } from 'react';
import { ArrowUp } from 'lucide-react';

interface TaskStartInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export function TaskStartInput({ onSubmit, disabled }: TaskStartInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSubmit(text);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-end gap-2 bg-white rounded-xl border border-gray-200 shadow-sm px-3 py-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Start a task…"
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-primary placeholder:text-muted outline-none leading-relaxed"
          style={{ minHeight: 24, maxHeight: 120 }}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          className="w-7 h-7 rounded-full bg-primary flex items-center justify-center transition-opacity disabled:opacity-30 flex-shrink-0"
        >
          <ArrowUp size={14} className="text-white" />
        </button>
      </div>
    </div>
  );
}
