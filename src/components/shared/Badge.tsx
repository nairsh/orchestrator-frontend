interface BadgeProps {
  label: string;
  variant?: 'new' | 'status';
  status?: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  planning: 'bg-blue-50 text-blue-600',
  executing: 'bg-amber-50 text-amber-600',
  running: 'bg-amber-50 text-amber-600',
  completed: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-600',
  cancelled: 'bg-gray-100 text-gray-500',
  paused: 'bg-purple-50 text-purple-600',
};

export function Badge({ label, variant = 'status', status }: BadgeProps) {
  if (variant === 'new') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-accent">
        New
      </span>
    );
  }

  const colorClass = statusColors[status ?? label.toLowerCase()] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${colorClass}`}>
      {label}
    </span>
  );
}
