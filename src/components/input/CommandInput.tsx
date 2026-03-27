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
  placeholder?: string;
  compactSendButton?: boolean;
}

export function CommandInput({ onSubmit, disabled, maxWidth = 600, modelLabel, animateEntry = false, placeholder, compactSendButton = false }: CommandInputProps) {
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

  const resolvedPlaceholder = placeholder ?? (disabled ? 'Task in progress…' : 'Ask a follow-up or give instructions…');

  return (
    <div
      className="flex-shrink-0 flex flex-col items-center gap-4 px-16 pb-6"
      style={{
        transition: 'transform 200ms ease-out, opacity 200ms ease-out',
        transform: entered ? 'translateY(0)' : 'translateY(-22px)',
        opacity: entered ? 1 : 0.96,
      }}
    >
      {/* Input card */}
      <div
        className="w-full bg-surface border border-border-light rounded-xl shadow-sm p-3 flex flex-col gap-4"
        style={{ maxWidth }}
      >
        {/* Text */}
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={resolvedPlaceholder}
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
              toastWarning('Files not supported here', 'Attach files from the home screen when starting a new task.');
            }}
            onOpenConnectors={() => {
              toastWarning('Open Connectors from the sidebar', 'Use the sidebar nav to access Connectors.');
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
              size={compactSendButton ? 'sm' : 'lg'}
              filled
              onClick={handleSubmit}
              disabled={!value.trim() || disabled}
              label="Send"
              className={[compactSendButton ? 'w-8 h-8' : '', value.trim() ? '' : '!bg-placeholder'].join(' ')}
            >
              <ArrowUp size={compactSendButton ? 14 : 16} />
            </IconButton>
          </div>
        </div>
      </div>

      {/* Drag handle pill */}
      <div className="w-12 h-1 rounded-pill bg-border" />
    </div>
  );
}
