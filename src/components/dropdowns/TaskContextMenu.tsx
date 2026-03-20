import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Pin, Pencil, Trash2 } from 'lucide-react';

interface TaskContextMenuProps {
  onPin?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}

export function TaskContextMenu({ onPin, onRename, onDelete }: TaskContextMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="w-6 h-6 rounded flex items-center justify-center text-muted hover:text-primary hover:bg-black/8 transition-all duration-150 opacity-0 group-hover:opacity-100 cursor-pointer"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreHorizontal size={14} />
      </button>

      <div
        className={`absolute right-0 top-full mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50 transition-all duration-150 origin-top-right ${
          open
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
        }`}
        role="menu"
      >
        <button
          type="button"
          role="menuitem"
          onClick={(e) => { e.stopPropagation(); onPin?.(); setOpen(false); }}
          className="w-full flex items-start gap-2.5 px-3.5 py-2 text-sm text-primary hover:bg-gray-50 transition-colors duration-150 cursor-pointer text-left"
        >
          <Pin size={13} className="text-muted flex-shrink-0 mt-0.5" />
          <span className="break-words">Pin workflow</span>
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={(e) => { e.stopPropagation(); onRename?.(); setOpen(false); }}
          className="w-full flex items-start gap-2.5 px-3.5 py-2 text-sm text-primary hover:bg-gray-50 transition-colors duration-150 cursor-pointer text-left"
        >
          <Pencil size={13} className="text-muted flex-shrink-0 mt-0.5" />
          <span className="break-words">Rename workflow</span>
        </button>
        <div className="border-t border-gray-100 my-1" />
        <button
          type="button"
          role="menuitem"
          onClick={(e) => { e.stopPropagation(); onDelete?.(); setOpen(false); }}
          className="w-full flex items-start gap-2.5 px-3.5 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors duration-150 cursor-pointer text-left"
        >
          <Trash2 size={13} className="flex-shrink-0 mt-0.5" />
          <span className="break-words">Delete workflow</span>
        </button>
      </div>
    </div>
  );
}
