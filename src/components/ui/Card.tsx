import type { ReactNode } from 'react';

/* ─── Card ───
 * Shared card container with consistent border, radius, and shadow.
 * Used for input cards, content panels, and task items.
 */

interface CardProps {
  children: ReactNode;
  /** Additional Tailwind classes. */
  className?: string;
  /** Padding preset. Default: 'md' */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses: Record<string, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div
      className={[
        'bg-surface border border-border-light rounded-xl shadow-sm',
        paddingClasses[padding],
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
