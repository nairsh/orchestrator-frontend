import { Tooltip, Hotkey } from '@lobehub/ui';
import type { NavId, NavItem } from './sidebar-types';
import { navHotkeys } from './sidebar-types';

/* ─── Collapsed nav (icon-only buttons with tooltips) ─── */

interface CollapsedNavProps {
  navItems: NavItem[];
  activeNav: NavId;
  onNavChange?: (id: NavId) => void;
}

export function SidebarCollapsedNav({ navItems, activeNav, onNavChange }: CollapsedNavProps) {
  return (
    <div className="mt-3 flex flex-col gap-0.5 w-full items-center">
      {navItems.map((item) => {
        const hotkey = navHotkeys[item.id];
        return (
          <div key={item.id} className="group relative flex items-center justify-center">
            <Tooltip
              title={
                <span className="flex items-center gap-2">
                  <span>{item.label}</span>
                  {hotkey && <Hotkey keys={hotkey} inverseTheme compact />}
                </span>
              }
              placement="right"
            >
              <button
                type="button"
                onClick={() => onNavChange?.(item.id)}
                aria-label={item.label}
                className={[
                  'flex items-center justify-center h-8 w-8 rounded-lg border-none cursor-pointer transition-colors duration-200',
                  activeNav === item.id ? 'bg-surface-hover' : 'bg-transparent hover:bg-surface-hover',
                ].join(' ')}
              >
                <span className="text-primary">{item.icon}</span>
              </button>
            </Tooltip>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Expanded nav (full-width buttons with labels + hotkeys) ─── */

interface ExpandedNavGroupProps {
  items: NavItem[];
  activeNav: NavId;
  onNavChange?: (id: NavId) => void;
}

export function SidebarExpandedNavGroup({ items, activeNav, onNavChange }: ExpandedNavGroupProps) {
  return (
    <div className="flex flex-col gap-[2px]">
      {items.map((item) => {
        const isActive = activeNav === item.id;
        const hotkey = navHotkeys[item.id];
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavChange?.(item.id)}
            className={[
              'group/nav w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg border-none cursor-pointer text-[13.5px] transition-colors duration-200 whitespace-nowrap',
              isActive
                ? 'bg-surface-hover text-primary font-normal'
                : 'bg-transparent text-primary hover:bg-surface-hover',
            ].join(' ')}
          >
            <span className="flex-shrink-0 text-muted">{item.icon}</span>
            <span>{item.label}</span>
            {hotkey && (
              <span className="ml-auto opacity-0 group-hover/nav:opacity-100 transition-opacity duration-200">
                <Hotkey keys={hotkey} compact />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
