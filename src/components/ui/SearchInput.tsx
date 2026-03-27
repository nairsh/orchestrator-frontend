import { useRef, type InputHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';

/* ─── SearchInput ───
 * Standardized search bar with icon, input, and clear button.
 * Used wherever a search/filter input is needed across the app.
 */

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  /** Called when Escape is pressed. Defaults to clearing the value. */
  onEscape?: () => void;
}

export function SearchInput({
  value,
  onChange,
  onClear,
  onEscape,
  className = '',
  placeholder = 'Search…',
  autoFocus,
  ...rest
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange('');
    onClear?.();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (onEscape) {
        onEscape();
      } else {
        handleClear();
      }
    }
  };

  return (
    <div className={`flex items-center gap-2 flex-1 ${className}`}>
      <Search size={14} className="text-muted flex-shrink-0" aria-hidden="true" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="flex-1 bg-transparent border-none outline-none text-sm font-sans text-primary placeholder:text-placeholder"
        aria-label={placeholder}
        {...rest}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center justify-center w-5 h-5 rounded text-muted hover:text-primary hover:bg-surface-hover transition-colors duration-200 flex-shrink-0 cursor-pointer"
          aria-label="Clear search"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
