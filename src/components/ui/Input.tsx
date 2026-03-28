import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

/* ─── Input ───
 * Shared text input with consistent styling.
 */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Optional label shown above the input. */
  label?: string;
  /** Error message shown below the input. */
  error?: string;
  /** Success message shown below the input. */
  success?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, success, className = '', id: providedId, ...rest }, ref) => {
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
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={[
            'w-full px-3.5 py-2.5 rounded-xl border text-sm font-sans text-primary',
            'outline-none transition-colors duration-200',
            'bg-surface placeholder:text-placeholder',
            error ? 'border-danger focus:border-danger' : success ? 'border-green-500/60 focus:border-green-500' : 'border-border-light focus:border-secondary',
            className,
          ].join(' ')}
          {...rest}
        />
        {error && (
          <p id={`${id}-error`} className="mt-1 text-xs text-danger font-sans" role="alert">{error}</p>
        )}
        {!error && success && (
          <p className="mt-1 text-xs text-success-muted font-sans">{success}</p>
        )}
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
  /** Min height (px). Default: 24 */
  minHeight?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ maxHeight = 160, minHeight = 24, className = '', onChange, ...rest }, ref) => {
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
        spellCheck={rest.spellCheck ?? false}
        autoCorrect={(rest.autoCorrect as string | undefined) ?? 'off'}
        autoCapitalize={(rest.autoCapitalize as string | undefined) ?? 'off'}
        className={[
          'w-full resize-none bg-transparent text-md font-sans text-primary',
          'placeholder:text-placeholder outline-none',
          className,
        ].join(' ')}
        style={{ minHeight, maxHeight, overflowX: 'hidden' }}
        rows={1}
        {...rest}
      />
    );
  },
);

Textarea.displayName = 'Textarea';
