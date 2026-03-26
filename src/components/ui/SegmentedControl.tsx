interface SegmentedControlProps<T extends string> {
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ value, options, onChange }: SegmentedControlProps<T>) {
  return (
    <div
      className="inline-flex items-center rounded-full p-1 gap-0.5"
      style={{ backgroundColor: '#E8E6E3', border: '1px solid #D8D6D2' }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              'relative px-4 h-8 rounded-full text-sm font-medium transition-all duration-150 cursor-pointer select-none whitespace-nowrap font-sans',
              active
                ? 'bg-white text-primary shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-white/40',
            ].join(' ')}
            style={active ? { border: '1px solid rgba(0,0,0,0.08)' } : {}}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
