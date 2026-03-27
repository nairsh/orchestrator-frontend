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
    'bg-ink text-white hover:opacity-[0.88] active:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed',
  secondary:
    'bg-surface border border-border-light text-primary hover:bg-surface-hover active:bg-surface-tertiary disabled:opacity-40 disabled:cursor-not-allowed',
  ghost:
    'bg-transparent text-secondary hover:text-primary hover:bg-surface-hover active:bg-surface-tertiary disabled:opacity-40 disabled:cursor-not-allowed',
  danger:
    'bg-danger/10 text-danger border border-danger/20 hover:bg-danger/15 active:bg-danger/20 disabled:opacity-30 disabled:cursor-not-allowed',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs rounded-lg gap-1.5',
  md: 'px-3.5 py-[7px] text-sm rounded-lg gap-2',
  lg: 'px-5 py-2.5 text-base rounded-xl gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={[
          'inline-flex items-center justify-center font-sans font-medium transition-colors duration-200 cursor-pointer disabled:cursor-default',
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
