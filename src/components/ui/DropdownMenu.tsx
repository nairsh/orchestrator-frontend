import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';

/* ─── DropdownMenu ───
 * Shared primitive for all dropdown/popover menus.
 * Handles open/close state, click-outside, animation, keyboard nav, and positioning.
 */

interface DropdownMenuProps {
  /** The trigger element — receives `onClick` and `aria-expanded`. */
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  /** Menu content rendered inside the animated panel. */
  children: ReactNode;
  /** Horizontal alignment of the menu relative to the trigger. Default: 'right' */
  align?: 'left' | 'right';
  /** Vertical direction the menu opens. Default: 'down' */
  direction?: 'up' | 'down';
  /** Fixed width in px. Default: 224 */
  width?: number;
  /** Max height in px. Default: 360 */
  maxHeight?: number;
  /** Close the menu when a menu item is clicked. Default: true */
  closeOnSelect?: boolean;
  /** Additional className on the outer wrapper. */
  className?: string;
}

export function DropdownMenu({
  trigger,
  children,
  align = 'right',
  direction = 'down',
  width = 224,
  maxHeight = 360,
  closeOnSelect = true,
  className = '',
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false));

  const toggle = () => setOpen((v) => !v);

  // Focus first menu item on open, handle keyboard navigation
  useEffect(() => {
    if (!open || !menuRef.current) return;
    const items = menuRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]');
    if (items.length > 0) items[0].focus();
  }, [open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) return;
    const menu = menuRef.current;
    if (!menu) return;
    const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    const idx = items.indexOf(document.activeElement as HTMLElement);

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = idx < items.length - 1 ? idx + 1 : 0;
        items[next]?.focus();
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev = idx > 0 ? idx - 1 : items.length - 1;
        items[prev]?.focus();
        break;
      }
      case 'Home':
        e.preventDefault();
        items[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        items[items.length - 1]?.focus();
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
    }
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`} onKeyDown={handleKeyDown}>
      {trigger({ open, toggle })}

      <div
        ref={menuRef}
        className={[
          'absolute z-50 bg-surface border border-border-light rounded-xl shadow-dropdown py-1.5',
          direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2',
          align === 'left' ? 'left-0' : 'right-0',
        ].join(' ')}
        style={{
          width,
          maxHeight,
          overflowY: 'auto',
          transition: 'opacity 200ms ease, transform 200ms ease',
          opacity: open ? 1 : 0,
          transform: open
            ? 'translateY(0)'
            : direction === 'up'
              ? 'translateY(4px)'
              : 'translateY(-4px)',
          pointerEvents: open ? 'auto' : 'none',
        }}
        role="menu"
        onClick={() => { if (closeOnSelect) setOpen(false); }}
      >
        {children}
      </div>
    </div>
  );
}

/* ─── DropdownMenuItem ─── */

interface DropdownMenuItemProps {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  destructive?: boolean;
  className?: string;
}

export function DropdownMenuItem({
  children,
  onClick,
  active = false,
  destructive = false,
  className = '',
}: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={[
        'w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-sans transition-colors duration-200 cursor-pointer text-left rounded-lg mx-0',
        destructive
          ? 'text-danger hover:bg-danger/15'
          : 'text-primary hover:bg-surface-hover',
        active && !destructive ? 'bg-surface-tertiary' : '',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}

/* ─── DropdownMenuDivider ─── */

export function DropdownMenuDivider() {
  return <div className="border-t border-border-subtle my-1" />;
}
