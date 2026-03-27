import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { PlusDropdown } from '../dropdowns/PlusDropdown';
import { IconButton, Textarea } from '../ui';
import { toastWarning } from '../../lib/toast';

interface CommandInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  maxWidth?: number;
  modelLabel?: string;
  animateEntry?: boolean;
}

export function CommandInput({ onSubmit, disabled, maxWidth = 600, modelLabel, animateEntry = false }: CommandInputProps) {
  const [value, setValue] = useState('');
  const [entered, setEntered] = useState(!animateEntry);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!animateEntry) {
      setEntered(true);
      return;
    }
    setEntered(false);
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [animateEntry]);

  const handleSubmit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSubmit(text);
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  return (
    <div
      className="flex-shrink-0 flex flex-col items-center gap-4 px-16 pb-6"
      style={{
        transition: 'transform 170ms ease-out, opacity 170ms ease-out',
        transform: entered ? 'translateY(0)' : 'translateY(-22px)',
        opacity: entered ? 1 : 0.96,
      }}
    >
      {/* Input card */}
      <div
        className="w-full bg-surface border border-border rounded-xl shadow p-3 flex flex-col gap-4"
        style={{ maxWidth }}
      >
        {/* Text */}
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Task in progress…' : 'Type a follow-up or command...'}
          disabled={disabled}
          maxHeight={160}
          className={disabled ? 'opacity-50' : ''}
        />

        {/* Bottom row */}
        <div className="flex items-center justify-between pt-2">
          {/* Left: plus dropdown */}
          <PlusDropdown
            outlined
            onUploadFiles={() => {
              toastWarning('Not supported here', 'Attachments can only be added when starting a new task.');
            }}
            onOpenConnectors={() => {
              toastWarning('Not available here', 'Open Connectors from the sidebar.');
            }}
          />

          {/* Right: model label + send */}
          <div className="flex items-center gap-3">
            {modelLabel && (
              <span className="font-sans text-md font-medium text-subtle px-2.5 py-1.5 rounded-md">
                {modelLabel}
              </span>
            )}
            <IconButton
              size="lg"
              filled
              onClick={handleSubmit}
              disabled={!value.trim() || disabled}
              label="Send"
              className={value.trim() ? '' : '!bg-placeholder'}
            >
              <ArrowUp size={16} />
            </IconButton>
          </div>
        </div>
      </div>

      {/* Drag handle pill */}
      <div className="w-12 h-1.5 rounded-pill bg-muted" />
    </div>
  );
}
