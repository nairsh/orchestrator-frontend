import { useState, useRef, useEffect } from 'react';
import { Plus, Paperclip, Plug, ChevronRight } from 'lucide-react';

interface PlusDropdownProps {
  /** When true, renders as a circle with border (landing page style). Default: false (dark filled, task input style). */
  openUpward?: boolean;
  /** Force outlined button style regardless of dropdown direction. */
  outlined?: boolean;
  onUploadFiles?: (files: File[]) => void;
  onOpenConnectors?: () => void;
}

export function PlusDropdown({ openUpward = false, outlined, onUploadFiles, onOpenConnectors }: PlusDropdownProps) {
  const [open, setOpen] = useState(false);
  const [menuDirection, setMenuDirection] = useState<'up' | 'down'>('down');
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const useOutlinedStyle = outlined ?? openUpward;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!open) return;

    const updatePlacement = () => {
      const trigger = ref.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const triggerRect = trigger.getBoundingClientRect();
      const menuHeight = menu.offsetHeight || 180;
      const gap = 8;
      const spaceBelow = window.innerHeight - triggerRect.bottom - gap;
      const spaceAbove = triggerRect.top - gap;

      if (spaceBelow >= menuHeight || spaceBelow >= spaceAbove) {
        setMenuDirection('down');
      } else {
        setMenuDirection('up');
      }
    };

    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const list = e.target.files;
          if (!list || list.length === 0) return;
          onUploadFiles?.(Array.from(list));
          e.target.value = '';
          setOpen(false);
        }}
      />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        style={{
          width: useOutlinedStyle ? 32 : 36,
          height: useOutlinedStyle ? 32 : 36,
          borderRadius: useOutlinedStyle ? 16 : 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: open && useOutlinedStyle ? '#F5F5F5' : useOutlinedStyle ? 'transparent' : '#111111',
          border: useOutlinedStyle ? '1px solid #D0D0D0' : 'none',
          cursor: 'pointer',
          transition: 'background 0.1s ease',
          flexShrink: 0,
        }}
      >
        <Plus size={useOutlinedStyle ? 16 : 14} color={useOutlinedStyle ? '#444444' : '#FFFFFF'} />
      </button>

      <div
        ref={menuRef}
        className={`absolute left-0 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50 ${
          menuDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
        }`}
        style={{
          transition: 'opacity 0.1s ease, transform 0.1s ease',
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0)' : menuDirection === 'up' ? 'translateY(4px)' : 'translateY(-4px)',
          pointerEvents: open ? 'auto' : 'none',
        }}
        role="menu"
      >
        <button
          type="button"
          role="menuitem"
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-primary hover:bg-gray-50 transition-colors duration-100 cursor-pointer"
          style={{ fontFamily: 'Inter' }}
          onClick={() => {
            if (!onUploadFiles) {
              setOpen(false);
              return;
            }
            fileInputRef.current?.click();
          }}
        >
          <Paperclip size={14} className="text-muted flex-shrink-0" />
          <span>Upload files or images</span>
        </button>
        <button
          type="button"
          role="menuitem"
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-primary hover:bg-gray-50 transition-colors duration-100 cursor-pointer"
          style={{ fontFamily: 'Inter' }}
          onClick={() => {
            setOpen(false);
            onOpenConnectors?.();
          }}
        >
          <Plug size={14} className="text-muted flex-shrink-0" />
          <span className="flex-1 text-left">Connectors and sources</span>
          <ChevronRight size={13} className="text-muted flex-shrink-0" />
        </button>
      </div>
    </div>
  );
}
