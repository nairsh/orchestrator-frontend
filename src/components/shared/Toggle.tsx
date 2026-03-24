interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-sm font-sans text-primary cursor-pointer"
    >
        <div
          className={`relative w-8 h-[18px] rounded-pill transition-colors duration-slow ${
          checked ? 'bg-accent' : 'bg-border-light'
        }`}
      >
        <div
          className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-surface shadow-xs transition-transform duration-slow ease-in-out ${
            checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
          }`}
        />
      </div>
      {label && <span>{label}</span>}
    </button>
  );
}
