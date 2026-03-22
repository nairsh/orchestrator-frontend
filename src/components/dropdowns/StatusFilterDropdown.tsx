import { useState } from 'react';
import { Check, ListFilter } from 'lucide-react';
import { DropdownMenu, DropdownMenuItem } from '../ui/DropdownMenu';

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
  const activeLabel = OPTIONS.find((o) => o.id === value)?.label ?? 'All statuses';

  return (
    <DropdownMenu
      width={200}
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={`Filter: ${activeLabel}`}
          className={`flex items-center justify-center rounded-md px-3 py-2 border border-border transition-colors duration-fast cursor-pointer ${
            open ? 'bg-surface' : 'bg-transparent'
          }`}
        >
          <ListFilter size={16} className="text-primary" />
        </button>
      )}
    >
      {OPTIONS.map((opt) => {
        const active = opt.id === value;
        return (
          <DropdownMenuItem
            key={opt.id ?? 'all'}
            active={active}
            onClick={() => onChange(opt.id)}
          >
            <span className="w-4 inline-flex justify-center">
              {active ? <Check size={14} className="text-primary" /> : null}
            </span>
            <span>{opt.label}</span>
          </DropdownMenuItem>
        );
      })}
    </DropdownMenu>
  );
}
