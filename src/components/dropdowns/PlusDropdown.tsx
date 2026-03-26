import { useState, useRef, useEffect } from 'react';
import { Plus, Paperclip, Plug, ChevronRight } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';

interface PlusDropdownProps {
  /** When true, renders as a circle with border (task input style). Default: false (dark filled). */
  openUpward?: boolean;
  /** Force outlined button style regardless of dropdown direction. */
  outlined?: boolean;
  /** Ghost style: no background or border, just the plain icon. Used on the landing page. */
  ghost?: boolean;
  /** Size of the trigger button. Default 'md'. */
  size?: 'sm' | 'md';
  onUploadFiles?: (files: File[]) => void;
  onOpenConnectors?: () => void;
}

export function PlusDropdown({ openUpward = false, outlined, ghost = false, size = 'md', onUploadFiles, onOpenConnectors }: PlusDropdownProps) {
  const [open, setOpen] = useState(false);
  const [menuDirection, setMenuDirection] = useState<'up' | 'down'>('down');
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const useOutlinedStyle = outlined ?? openUpward;

  useClickOutside(ref, () => setOpen(false));

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
        className={[
          'flex items-center justify-center flex-shrink-0 transition-colors duration-fast cursor-pointer',
          ghost
            ? 'h-8 rounded-full aspect-[9/8] text-secondary hover:text-primary'
            : useOutlinedStyle
              ? `${size === 'sm' ? 'w-7 h-7' : 'w-9 h-9'} rounded-full border border-border ${open ? 'bg-surface-tertiary' : 'bg-transparent'}`
              : `${size === 'sm' ? 'w-7 h-7' : 'w-9 h-9'} rounded-full bg-ink`,
        ].join(' ')}
      >
        <Plus size={ghost ? 20 : size === 'sm' ? 14 : useOutlinedStyle ? 18 : 14} className={ghost ? '' : useOutlinedStyle ? 'text-secondary' : 'text-primary'} />
      </button>

      <div
        ref={menuRef}
        className={[
          'absolute left-0 w-56 bg-surface border border-border rounded-lg shadow-dropdown py-1 z-50',
          menuDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2',
        ].join(' ')}
        style={{
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          transition: 'opacity 100ms ease, transform 100ms ease',
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0)' : menuDirection === 'up' ? 'translateY(4px)' : 'translateY(-4px)',
          pointerEvents: open ? 'auto' : 'none',
        }}
        role="menu"
      >
        <button
          type="button"
          role="menuitem"
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-primary hover:bg-surface-hover transition-colors duration-fast cursor-pointer font-sans"
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
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-primary hover:bg-surface-hover transition-colors duration-fast cursor-pointer font-sans"
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
