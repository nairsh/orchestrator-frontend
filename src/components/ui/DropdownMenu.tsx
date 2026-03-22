import { useRef, useState, type ReactNode } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';

/* ─── DropdownMenu ───
 * Shared primitive for all dropdown/popover menus.
 * Handles open/close state, click-outside, animation, and positioning.
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
  className = '',
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false));

  const toggle = () => setOpen((v) => !v);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {trigger({ open, toggle })}

      <div
        className={[
          'absolute z-50 bg-surface border border-border rounded-lg shadow-dropdown py-1',
          direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2',
          align === 'left' ? 'left-0' : 'right-0',
        ].join(' ')}
        style={{
          width,
          maxHeight,
          overflowY: 'auto',
          transition: 'opacity 100ms ease, transform 100ms ease',
          opacity: open ? 1 : 0,
          transform: open
            ? 'translateY(0)'
            : direction === 'up'
              ? 'translateY(4px)'
              : 'translateY(-4px)',
          pointerEvents: open ? 'auto' : 'none',
        }}
        role="menu"
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
        'w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-sans transition-colors duration-fast cursor-pointer text-left',
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
