import { useEffect } from 'react';
import { Hotkey } from '@lobehub/ui';
import { ActionIcon } from '@lobehub/ui';
import { X } from 'lucide-react';

interface ShortcutDef {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

const SHORTCUTS: ShortcutDef[] = [];

export function registerShortcuts(shortcuts: ShortcutDef[]) {
  SHORTCUTS.length = 0;
  SHORTCUTS.push(...shortcuts);
}

export function getShortcuts(): ShortcutDef[] {
  return [...SHORTCUTS];
}

export function useKeyboardShortcuts(shortcuts: ShortcutDef[]) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      for (const shortcut of shortcuts) {
        const metaMatch = shortcut.meta ? (e.metaKey || e.ctrlKey) : true;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (metaMatch && shiftMatch && keyMatch) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [shortcuts]);
}

export function KeyboardShortcutsOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const sections = [
    {
      title: 'General',
      shortcuts: [
        { keys: ['⌘', 'K'], description: 'Command palette', inverseKeys: 'meta+k' },
        { keys: ['N'], description: 'New task', inverseKeys: 'n' },
        { keys: ['?'], description: 'Show keyboard shortcuts', inverseKeys: 'shift+?' },
        { keys: ['Esc'], description: 'Close modal / palette', inverseKeys: 'escape' },
      ],
    },
    {
      title: 'Navigation',
      shortcuts: [
        { keys: ['⌘', '⇧', 'O'], description: 'Go to Tasks', inverseKeys: 'mod+shift+o' },
        { keys: ['⌘', '⇧', 'E'], description: 'Go to Files', inverseKeys: 'mod+shift+e' },
        { keys: ['⌘', '⇧', 'L'], description: 'Go to Connectors', inverseKeys: 'mod+shift+l' },
        { keys: ['⌘', '⇧', 'K'], description: 'Go to Skills', inverseKeys: 'mod+shift+k' },
        { keys: ['⌘', '⇧', 'C'], description: 'Toggle chat', inverseKeys: 'mod+shift+c' },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-surface rounded-2xl shadow-modal border border-border-light overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
          <h2 className="text-sm font-semibold text-primary">Keyboard Shortcuts</h2>
          <ActionIcon onClick={onClose} size="small" icon={X} title="Close shortcuts" />
        </div>
        <div className="px-5 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">{section.title}</h3>
              <div className="space-y-1.5">
                {section.shortcuts.map((s) => (
                  <div key={s.description} className="flex items-center justify-between py-1">
                    <span className="text-sm text-secondary">{s.description}</span>
                    <Hotkey keys={s.inverseKeys} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
