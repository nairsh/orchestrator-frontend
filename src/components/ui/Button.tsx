import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

/* ─── Button ───
 * Shared button primitive with variant support.
 * Replaces the scattered inline button styles across the app.
 */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-ink text-primary hover:bg-surface-secondary disabled:opacity-30',
  secondary:
    'bg-surface border border-border text-primary hover:bg-surface-hover disabled:opacity-40',
  ghost:
    'bg-transparent text-muted hover:text-primary hover:bg-surface-hover disabled:opacity-40',
  danger:
    'bg-danger text-primary hover:bg-danger/80 disabled:opacity-30',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs rounded-md',
  md: 'px-3.5 py-1.5 text-sm rounded-lg',
  lg: 'px-4 py-2 text-base rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={[
          'inline-flex items-center justify-center font-sans font-medium transition-colors duration-150 cursor-pointer disabled:cursor-default',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(' ')}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
