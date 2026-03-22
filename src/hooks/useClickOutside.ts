import { useEffect, type RefObject } from 'react';

/**
 * Calls `handler` when a mousedown event occurs outside `ref`.
 * Replaces the duplicated document.addEventListener('mousedown', …) pattern
 * found across all dropdowns and modals.
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handler();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [ref, handler, enabled]);
}
