import { useCallback, useEffect, useRef, useState } from 'react';

interface ResizableDividerProps {
  width: number;
  onWidthChange: (nextWidth: number) => void;
  minWidth?: number;
  maxWidth?: number;
}

export function ResizableDivider({
  width,
  onWidthChange,
  minWidth = 240,
  maxWidth = 600,
}: ResizableDividerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(width);
  const rafRef = useRef<number | null>(null);
  const pendingWidthRef = useRef<number | null>(null);

  const clamp = useCallback(
    (value: number) => Math.max(minWidth, Math.min(maxWidth, value)),
    [minWidth, maxWidth]
  );

  const flushPending = useCallback(() => {
    rafRef.current = null;
    if (pendingWidthRef.current === null) return;
    onWidthChange(pendingWidthRef.current);
  }, [onWidthChange]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startXRef.current = e.clientX;
      startWidthRef.current = width;
      document.documentElement.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [width]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const delta = e.clientX - startXRef.current;
      const nextWidth = clamp(startWidthRef.current + delta);
      pendingWidthRef.current = nextWidth;

      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(flushPending);
      }
    };

    const handleMouseUp = () => {
      if (!isDragging) return;
      setIsDragging(false);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (pendingWidthRef.current !== null) {
        onWidthChange(pendingWidthRef.current);
      }
      pendingWidthRef.current = null;
      document.documentElement.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, clamp, flushPending, onWidthChange]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      document.documentElement.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  const pillOpacity = isDragging ? 1 : isHovering ? 0.9 : 0.6;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 12, cursor: 'col-resize', background: 'transparent', zIndex: 10 }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      aria-hidden="true"
    >
      <div className="w-px h-full bg-border" />
      <div
        className="absolute bg-muted"
        style={{
          width: 4,
          height: 48,
          borderRadius: 999,
          opacity: pillOpacity,
          transition: 'opacity 120ms ease',
        }}
      />
    </div>
  );
}
