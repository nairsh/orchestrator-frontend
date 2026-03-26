import { Tag } from '@lobehub/ui';

interface BadgeProps {
  label: string;
  variant?: 'new' | 'status';
  status?: string;
}

const statusColors: Record<string, string> = {
  pending: 'default',
  planning: 'info',
  executing: 'warning',
  running: 'warning',
  completed: 'success',
  failed: 'error',
  cancelled: 'default',
  paused: 'purple',
};

export function Badge({ label, variant = 'status', status }: BadgeProps) {
  if (variant === 'new') {
    return <Tag color="green" size="small">New</Tag>;
  }

  const color = statusColors[status ?? label.toLowerCase()] ?? 'default';
  return <Tag color={color} size="small">{label}</Tag>;
}
