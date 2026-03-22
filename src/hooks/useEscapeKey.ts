import { useEffect } from 'react';

/**
 * Calls `handler` when the Escape key is pressed.
 * Replaces the duplicated document.addEventListener('keydown', …) pattern
 * found across modals and chat views.
 */
export function useEscapeKey(handler: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handler();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [handler, enabled]);
}
