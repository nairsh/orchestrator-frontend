interface AvatarProps {
  initial?: string;
  size?: number;
}

export function Avatar({ initial = 'U', size = 28 }: AvatarProps) {
  return (
    <div
      className="rounded-full bg-ink flex items-center justify-center text-primary font-semibold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial.toUpperCase()}
    </div>
  );
}
