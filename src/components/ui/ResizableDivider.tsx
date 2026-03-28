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

  const STEP = 20;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let nextWidth: number | null = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextWidth = clamp(width + STEP);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        nextWidth = clamp(width - STEP);
      } else if (e.key === 'Home') {
        e.preventDefault();
        nextWidth = minWidth;
      } else if (e.key === 'End') {
        e.preventDefault();
        nextWidth = maxWidth;
      }
      if (nextWidth !== null) onWidthChange(nextWidth);
    },
    [width, clamp, minWidth, maxWidth, onWidthChange]
  );

  const pillOpacity = isDragging ? 1 : isHovering ? 0.8 : 0.4;
  const pct = Math.round(((width - minWidth) / (maxWidth - minWidth)) * 100);

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Resize sidebar"
      className="relative flex items-center justify-center w-3 cursor-col-resize z-10 outline-none focus-visible:ring-2 focus-visible:ring-info/50 rounded"
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onKeyDown={handleKeyDown}
    >
      <div className="w-px h-full bg-border-subtle" />
      <div
        className="absolute w-1 h-10 rounded-full bg-placeholder transition-opacity duration-200"
        style={{ opacity: pillOpacity }}
      />
    </div>
  );
}
