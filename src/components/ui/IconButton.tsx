import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

/* ─── IconButton ───
 * Minimal icon-only button used for close, menu, settings, etc.
 */

type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  size?: IconButtonSize;
  /** Makes the button a filled circle (e.g. send button). */
  filled?: boolean;
  label?: string;
}

const sizeMap: Record<IconButtonSize, string> = {
  sm: 'w-6 h-6',
  md: 'w-7 h-7',
  lg: 'w-9 h-9',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = 'md', filled = false, label, className = '', children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        className={[
          'inline-flex items-center justify-center flex-shrink-0 transition-colors duration-150 cursor-pointer disabled:cursor-default disabled:opacity-30',
          sizeMap[size],
          filled
            ? 'rounded-full !bg-black !text-white hover:!bg-black/90'
            : 'rounded-lg text-muted hover:text-primary hover:bg-surface-hover',
          className,
        ].join(' ')}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';
