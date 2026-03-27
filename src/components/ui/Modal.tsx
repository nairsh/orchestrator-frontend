import { useEffect, useState, type ReactNode } from 'react';
import { useEscapeKey } from '../../hooks/useEscapeKey';

/* ─── Modal ───
 * Shared primitive for dialogs / modal overlays.
 * Handles backdrop, enter/exit animation, Escape to close.
 */

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  /** Max width Tailwind class. Default: 'max-w-2xl' */
  maxWidth?: string;
  /** Additional className on the inner card. */
  className?: string;
}

export function Modal({ children, onClose, maxWidth = 'max-w-2xl', className = '' }: ModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEscapeKey(handleClose);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 150);
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) handleClose();
  };

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-all duration-200 ${
        visible ? 'bg-black/30' : 'bg-black/0'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        className={[
          'bg-surface rounded-2xl shadow-lg border border-border-subtle w-full overflow-hidden transition-all duration-200',
          maxWidth,
          visible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-2 scale-[0.97]',
          className,
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  );
}

/* ─── ModalHeader ─── */

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
  children?: ReactNode;
}

export function ModalHeader({ title, onClose, children }: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-primary">{title}</h2>
        {children}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="w-8 h-8 rounded-xl flex items-center justify-center text-muted hover:text-primary hover:bg-surface-hover transition-colors duration-200 cursor-pointer"
        aria-label="Close"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

/* ─── ModalBody ─── */

export function ModalBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 py-5 ${className}`}>{children}</div>;
}

/* ─── ModalFooter ─── */

export function ModalFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between px-5 py-4 border-t border-border-subtle bg-surface-secondary/60 ${className}`}>
      {children}
    </div>
  );
}
