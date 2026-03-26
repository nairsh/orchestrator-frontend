import { type MouseEventHandler, type ReactNode } from 'react';
import { ActionIcon as LobeActionIcon } from '@lobehub/ui';
import { Tooltip } from '@lobehub/ui';
import type { ActionIconSize } from '@lobehub/ui';

type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps {
  children?: ReactNode;
  size?: IconButtonSize;
  filled?: boolean;
  label?: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
  disabled?: boolean;
  [key: string]: unknown;
}

const sizeMap: Record<IconButtonSize, ActionIconSize> = {
  sm: 'small',
  md: 'middle',
  lg: 'large',
};

export function IconButton({ size = 'md', filled = false, label, className = '', children, onClick, disabled, ...rest }: IconButtonProps) {
  const btn = (
    <LobeActionIcon
      size={sizeMap[size]}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={filled ? { backgroundColor: 'var(--relay-primary)', color: 'white', borderRadius: '50%' } : undefined}
      icon={children as any}
      {...rest}
    />
  );

  if (label) {
    return <Tooltip title={label}>{btn}</Tooltip>;
  }
  return btn;
}
