import { forwardRef, useId, type SelectHTMLAttributes } from 'react';

/* ─── Select ───
 * Shared select dropdown with consistent styling.
 * Mirrors Input component API with optional label.
 */

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  /** Optional label shown above the select. */
  label?: string;
  /** Options to render. For custom option rendering, use `children` via renderOptions. */
  options: SelectOption[];
  /** Optional placeholder option shown first (value=""). */
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, placeholder, className = '', id: providedId, ...rest }, ref) => {
    const autoId = useId();
    const id = providedId ?? autoId;
    return (
      <div>
        {label && (
          <label htmlFor={id} className="block text-xs font-medium text-primary mb-1.5">{label}</label>
        )}
        <select
          ref={ref}
          id={id}
          className={[
            'w-full px-3 py-2 rounded-lg border border-border-light text-sm font-sans text-primary',
            'outline-none focus:border-muted transition-colors duration-150',
            'bg-surface',
            className,
          ].join(' ')}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  },
);

Select.displayName = 'Select';
