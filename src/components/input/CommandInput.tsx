import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { PlusDropdown } from '../dropdowns/PlusDropdown';
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

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
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
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a command..."
          disabled={disabled}
          rows={1}
          className="w-full resize-none bg-transparent text-md font-sans text-primary placeholder:text-placeholder outline-none"
          style={{ minHeight: 24, maxHeight: 160 }}
        />

        {/* Bottom row */}
        <div className="flex items-center justify-between pt-2">
          {/* Left: plus dropdown */}
          <PlusDropdown
            outlined
            onUploadFiles={() => {
              toastWarning('Not supported yet', 'Attachments are only supported when starting a new workflow.');
            }}
            onOpenConnectors={() => {
              toastWarning('Not available here', 'Open Connectors from the sidebar.');
            }}
          />

          {/* Right: send */}
          <div className="flex items-center gap-3">
            {modelLabel && (
              <div className="flex items-center gap-1.5 font-sans text-md font-medium text-subtle px-2.5 py-1.5 rounded-md">
                <span className="font-sans text-md font-medium text-subtle">{modelLabel}</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!value.trim() || disabled}
              className={[
                'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-150 cursor-pointer disabled:cursor-default',
                value.trim() ? 'bg-ink' : 'bg-placeholder',
              ].join(' ')}
            >
              <ArrowUp size={16} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Drag handle pill */}
      <div className="w-12 h-1.5 rounded-pill bg-muted" />
    </div>
  );
}
