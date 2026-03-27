interface SegmentedControlProps<T extends string> {
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ value, options, onChange }: SegmentedControlProps<T>) {
  return (
    <div
      className="inline-flex items-center rounded-full p-1 gap-0.5 bg-surface-tertiary border border-border-subtle"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              'relative px-4 h-8 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer select-none whitespace-nowrap font-sans',
              active
                ? 'bg-surface text-primary shadow-sm border border-border-subtle'
                : 'text-muted hover:text-primary border border-transparent',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
