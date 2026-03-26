import { Segmented } from '@lobehub/ui';

interface TabPillProps {
  active: boolean;
  label: string;
  onClick: () => void;
}

/** Backwards-compatible single-tab wrapper around LobeUI Segmented.
 *  For multi-tab usage, prefer <Segmented> directly. */
export function TabPill({ active, label, onClick }: TabPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150',
        active ? 'border-border bg-surface text-primary shadow-sm' : 'border-border-light bg-surface-secondary text-secondary hover:bg-surface',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

/** Multi-option segmented control using LobeUI. */
export function TabSegmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
}) {
  return (
    <Segmented
      value={value}
      options={options}
      onChange={(val) => onChange(val as T)}
      size="small"
    />
  );
}
