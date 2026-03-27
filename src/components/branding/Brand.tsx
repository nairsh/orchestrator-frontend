import { ClaudeCode } from '@lobehub/icons';

interface BrandMarkProps {
  size?: number;
  className?: string;
}

interface BrandWordmarkProps {
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
}

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function BrandMark({ size = 18, className }: BrandMarkProps) {
  return <ClaudeCode size={size} className={className} />;
}

export function BrandWordmark({
  className,
  primaryClassName,
  secondaryClassName,
}: BrandWordmarkProps) {
  return (
    <div className={joinClasses('flex items-baseline gap-[3px]', className)}>
      <span
        className={joinClasses(
          'font-display font-medium text-primary tracking-[-0.4px]',
          primaryClassName,
        )}
      >
        relay
      </span>
      <span
        className={joinClasses(
          'font-display font-light text-secondary tracking-[-0.4px]',
          secondaryClassName,
        )}
      >
        pro
      </span>
    </div>
  );
}
