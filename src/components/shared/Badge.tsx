interface BadgeProps {
  label: string;
  variant?: 'new' | 'status';
  status?: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-surface-tertiary text-muted',
  planning: 'bg-info/15 text-info',
  executing: 'bg-warning/15 text-warning',
  running: 'bg-warning/15 text-warning',
  completed: 'bg-accent/15 text-accent',
  failed: 'bg-danger/15 text-danger',
  cancelled: 'bg-surface-tertiary text-muted',
  paused: 'bg-surface-secondary text-secondary',
};

export function Badge({ label, variant = 'status', status }: BadgeProps) {
  if (variant === 'new') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-semibold bg-accent/15 text-accent">
        New
      </span>
    );
  }

  const colorClass = statusColors[status ?? label.toLowerCase()] ?? 'bg-surface-tertiary text-muted';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}
