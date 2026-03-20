import { useEffect, useRef, useState } from 'react';
import { Check, ListFilter } from 'lucide-react';

export type WorkflowStatusFilter =
  | undefined
  | 'pending'
  | 'executing'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

interface StatusFilterDropdownProps {
  value: WorkflowStatusFilter;
  onChange: (value: WorkflowStatusFilter) => void;
}

const OPTIONS: Array<{ id: WorkflowStatusFilter; label: string }> = [
  { id: undefined, label: 'All statuses' },
  { id: 'executing', label: 'Executing' },
  { id: 'paused', label: 'Paused' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' },
  { id: 'cancelled', label: 'Cancelled' },
];

export function StatusFilterDropdown({ value, onChange }: StatusFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const activeLabel = OPTIONS.find((o) => o.id === value)?.label ?? 'All statuses';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center justify-center"
        style={{
          borderRadius: 8,
          padding: '8px 12px',
          border: '1px solid #E0E0E0',
          background: open ? '#FFFFFF' : 'transparent',
        }}
        aria-label={`Filter: ${activeLabel}`}
      >
        <ListFilter size={16} color="#111111" />
      </button>

      <div
        className="absolute top-full mt-2 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1"
        style={{
          width: 200,
          transition: 'opacity 0.1s ease, transform 0.1s ease',
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0)' : 'translateY(-4px)',
          pointerEvents: open ? 'auto' : 'none',
        }}
        role="menu"
      >
        {OPTIONS.map((opt) => {
          const active = opt.id === value;
          return (
            <button
              key={opt.id ?? 'all'}
              type="button"
              role="menuitem"
              onClick={() => {
                onChange(opt.id);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-primary hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
              style={{
                fontFamily: 'Inter',
                background: active ? '#F5F5F5' : 'transparent',
              }}
            >
              <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}>
                {active ? <Check size={14} color="#111111" /> : null}
              </span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
