import type { ReactNode } from 'react';
import { PackageOpen } from 'lucide-react';

interface RelayEmptyProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * App-styled empty state component.
 * Warm surface, centered layout, muted tones — matches the relay design system.
 */
export function RelayEmpty({
  icon,
  title,
  description,
  action,
  className = '',
}: RelayEmptyProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 ${className}`}>
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-secondary border border-border-light mb-5">
        {icon ?? <PackageOpen size={26} className="text-muted" />}
      </div>
      {title && (
        <h3 className="text-base font-semibold text-primary mb-1.5">{title}</h3>
      )}
      {description && (
        <p className="text-sm text-muted font-sans text-center max-w-xs leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
