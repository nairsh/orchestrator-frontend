import { useState, useRef } from 'react';
import { MoreHorizontal, Pin, PinOff, Pencil, Trash2 } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';

interface TaskContextMenuProps {
  onPin?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  isPinned?: boolean;
}

export function TaskContextMenu({ onPin, onRename, onDelete, isPinned = false }: TaskContextMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="w-6 h-6 rounded-lg flex items-center justify-center text-muted hover:text-primary hover:bg-surface-hover transition-all duration-200 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 cursor-pointer"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Task actions"
      >
        <MoreHorizontal size={14} />
      </button>

      <div
        className={[
          'absolute right-0 top-full mt-1.5 w-44 bg-surface border border-border-light rounded-xl shadow-dropdown py-1 z-50 transition-all duration-200 origin-top-right',
          open
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-1 pointer-events-none',
        ].join(' ')}
        role="menu"
      >
        <button
          type="button"
          role="menuitem"
          onClick={(e) => { e.stopPropagation(); onPin?.(); setOpen(false); }}
          className="w-full flex items-start gap-2.5 px-3.5 py-2 text-sm text-primary hover:bg-surface-hover transition-colors duration-200 cursor-pointer text-left active:bg-surface-tertiary"
        >
          <Pin size={13} className="text-muted flex-shrink-0 mt-0.5" />
          <span className="break-words">{isPinned ? 'Unpin task' : 'Pin task'}</span>
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={(e) => { e.stopPropagation(); onRename?.(); setOpen(false); }}
          className="w-full flex items-start gap-2.5 px-3.5 py-2 text-sm text-primary hover:bg-surface-hover transition-colors duration-200 cursor-pointer text-left active:bg-surface-tertiary"
        >
          <Pencil size={13} className="text-muted flex-shrink-0 mt-0.5" />
          <span className="break-words">Rename task</span>
        </button>
        <div className="border-t border-border-subtle my-1" />
        <button
          type="button"
          role="menuitem"
          onClick={(e) => { e.stopPropagation(); onDelete?.(); setOpen(false); }}
          className="w-full flex items-start gap-2.5 px-3.5 py-2 text-sm text-danger hover:bg-danger/10 transition-colors duration-200 cursor-pointer text-left active:bg-surface-tertiary"
        >
          <Trash2 size={13} className="flex-shrink-0 mt-0.5" />
          <span className="break-words">Delete task</span>
        </button>
      </div>
    </div>
  );
}
