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
      className="flex-shrink-0 flex flex-col items-center"
      style={{
        padding: '0 64px 24px 64px',
        gap: 16,
        transition: 'transform 170ms ease-out, opacity 170ms ease-out',
        transform: entered ? 'translateY(0)' : 'translateY(-22px)',
        opacity: entered ? 1 : 0.96,
      }}
    >
      {/* Input card */}
      <div
        style={{
          width: '100%',
          maxWidth,
          borderRadius: 16,
          background: '#FFFFFF',
          border: '1px solid #E0E0E0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
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
          style={{
            fontFamily: 'Inter',
            fontSize: 15,
            color: '#111111',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            minHeight: 24,
            maxHeight: 160,
            width: '100%',
          }}
          className="placeholder-[#A0A0A0]"
        />

        {/* Bottom row */}
        <div className="flex items-center justify-between" style={{ paddingTop: 8 }}>
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
          <div className="flex items-center" style={{ gap: 12 }}>
            {modelLabel && (
              <div
                className="flex items-center"
                style={{
                  gap: 6,
                  fontFamily: 'Inter',
                  fontSize: 15,
                  fontWeight: 500,
                  color: '#777777',
                  background: 'transparent',
                  border: 'none',
                  padding: '6px 10px',
                  borderRadius: 8,
                }}
              >
                <span style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: 500, color: '#777777' }}>{modelLabel}</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!value.trim() || disabled}
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                background: value.trim() ? '#222222' : '#9E9E9E',
                border: 'none',
                cursor: value.trim() ? 'pointer' : 'default',
                transition: 'background 0.15s',
              }}
            >
              <ArrowUp size={16} color="#FFFFFF" />
            </button>
          </div>
        </div>
      </div>

      {/* Drag handle pill */}
      <div style={{ width: 48, height: 6, borderRadius: 3, background: '#999999' }} />
    </div>
  );
}
