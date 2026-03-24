import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

/* ─── Input ───
 * Shared text input with consistent styling.
 */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Optional label shown above the input. */
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = '', id: providedId, ...rest }, ref) => {
    const autoId = useId();
    const id = providedId ?? autoId;
    return (
      <div>
        {label && (
          <label htmlFor={id} className="block text-xs font-medium text-primary mb-1.5">{label}</label>
        )}
        <input
          ref={ref}
          id={id}
          className={[
            'w-full px-3 py-2 rounded-lg border border-border-light text-sm font-sans text-primary',
            'outline-none focus:border-muted transition-colors duration-150',
            'bg-surface placeholder:text-placeholder',
            className,
          ].join(' ')}
          {...rest}
        />
      </div>
    );
  },
);

Input.displayName = 'Input';

/* ─── Textarea ───
 * Auto-growing textarea used in chat/command inputs.
 */

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Max height before scrolling (px). Default: 160 */
  maxHeight?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ maxHeight = 160, className = '', onChange, ...rest }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const el = e.target;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
      onChange?.(e);
    };

    return (
      <textarea
        ref={ref}
        onChange={handleChange}
        className={[
          'w-full resize-none bg-transparent text-md font-sans text-primary',
          'placeholder:text-placeholder outline-none',
          className,
        ].join(' ')}
        style={{ minHeight: 24, maxHeight }}
        rows={1}
        {...rest}
      />
    );
  },
);

Textarea.displayName = 'Textarea';
