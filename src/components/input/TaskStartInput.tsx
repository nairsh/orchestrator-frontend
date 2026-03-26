import { useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { Textarea } from '../ui';

interface TaskStartInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export function TaskStartInput({ onSubmit, disabled }: TaskStartInputProps) {
  const [value, setValue] = useState('');

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

  return (
    <div className="px-4 py-3">
      <div className="flex items-end gap-2 bg-surface rounded-xl border border-border shadow-sm px-3 py-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Start a task..."
          disabled={disabled}
          rows={1}
          maxHeight={120}
          className="flex-1 resize-none bg-transparent text-sm font-sans text-primary placeholder:text-placeholder outline-none leading-relaxed border-none p-0 min-h-[24px]"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          aria-label="Send"
          className="flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center transition-opacity cursor-pointer disabled:opacity-40"
          style={{ backgroundColor: 'var(--relay-primary, #0A0A0A)', color: 'white' }}
        >
          <ArrowUp size={13} />
        </button>
      </div>
    </div>
  );
}
