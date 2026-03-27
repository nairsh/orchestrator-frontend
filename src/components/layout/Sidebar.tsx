import { useEffect, useRef, useState } from 'react';
import { Tooltip, Hotkey } from '@lobehub/ui';
import type { ApiConfig } from '../../api/client';
import { useClickOutside } from '../../hooks/useClickOutside';
import { NotificationCenter } from '../NotificationCenter';
import type { WorkflowSummary } from '../../api/types';
import {
  IconPlus, IconSearch,
  IconTasks, IconFiles, IconConnectors, IconSkills,
  IconSidebarToggle, IconMenu, IconSettings,
  IconSun, IconMoon, IconLogOut, IconFolder, IconChevronUpDown,
} from '../icons/CustomIcons';

type NavId = 'search' | 'computer' | 'new' | 'tasks' | 'files' | 'connectors' | 'skills';

/* ─── Hotkey mapping ─── */

const navHotkeys: Partial<Record<NavId, string>> = {
  new: 'n',
  search: 'mod+k',
  tasks: 'g+t',
  files: 'g+f',
  connectors: 'g+c',
  skills: 'g+s',
};

/* ─── Nav item definitions ─── */

interface NavItem {
  id: NavId;
  label: string;
  icon: React.ReactNode;
  group: 'action' | 'page';
}

const getNavItems = (): NavItem[] => [
  { id: 'new',        label: 'New task',    icon: <IconPlus size={17} />,       group: 'action' },
  { id: 'search',     label: 'Search',      icon: <IconSearch size={17} />,     group: 'action' },
  { id: 'tasks',      label: 'Tasks',       icon: <IconTasks size={17} />,      group: 'page' },
  { id: 'files',      label: 'Files',       icon: <IconFiles size={17} />,      group: 'page' },
  { id: 'connectors', label: 'Connectors',  icon: <IconConnectors size={17} />, group: 'page' },
  { id: 'skills',     label: 'Skills',      icon: <IconSkills size={17} />,     group: 'page' },
];

/* ─── Types ─── */

interface SidebarProps {
  activeNav?: NavId;
  onNavChange?: (id: NavId) => void;
  config?: ApiConfig;
  onOpenSettings?: () => void;
  onSignOut?: () => Promise<void>;
  isSignedIn?: boolean;
  userLabel?: string | null;
  userAvatarUrl?: string | null;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  workflows?: WorkflowSummary[];
  pinnedIds?: Set<string>;
  onSelectWorkflow?: (id: string, objective: string) => void;
}

/* ─── Constants ─── */

const WIDTH_EXPANDED = 240;
const WIDTH_COLLAPSED = 44;

/* ─── Component ─── */

export function Sidebar({
  activeNav = 'tasks',
  onNavChange,
  onOpenSettings,
  onSignOut,
  isSignedIn = false,
  userLabel,
  userAvatarUrl,
  collapsed: collapsedProp,
  onCollapsedChange,
  workflows = [],
  pinnedIds,
  onSelectWorkflow,
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = collapsedProp !== undefined ? collapsedProp : internalCollapsed;
  const setCollapsed = (value: boolean) => {
    if (onCollapsedChange) onCollapsedChange(value);
    else setInternalCollapsed(value);
  };

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('relay-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  });
  const profileMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(profileMenuRef, () => setProfileMenuOpen(false), !collapsed);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    document.documentElement.classList.toggle('dark', themeMode === 'dark');
    localStorage.setItem('relay-theme', themeMode);
  }, [themeMode]);

  const navItems = getNavItems();
  const actionItems = navItems.filter((i) => i.group === 'action');
  const pageItems = navItems.filter((i) => i.group === 'page');

  const displayName = userLabel?.trim() || (isSignedIn ? 'User' : 'Guest');
  const avatarLetter = displayName[0]?.toUpperCase() ?? 'U';

  // Starred & Recents
  const starred = pinnedIds
    ? workflows.filter((w) => pinnedIds.has(w.id))
    : [];
  const recents = workflows
    .filter((w) => !pinnedIds?.has(w.id))
    .slice(0, 6);

  /* ─── Collapsed state ─── */

  if (collapsed) {
    return (
      <aside
        className="flex flex-col h-full flex-shrink-0 app-ui items-center bg-sidebar border-r border-sidebar transition-[width] duration-slow overflow-visible"
        style={{ width: WIDTH_COLLAPSED, padding: '12px 0' }}
      >
        <div className="group relative flex items-center justify-center">
          <Tooltip title="Menu" placement="right">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="flex items-center justify-center flex-shrink-0 h-10 w-10 bg-transparent border-none cursor-pointer rounded-md hover:bg-surface-hover transition-colors"
              aria-label="Expand sidebar"
            >
              <IconMenu size={16} className="text-primary" />
            </button>
          </Tooltip>
        </div>

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
                      'flex items-center justify-center h-8 w-8 rounded-md border-none cursor-pointer transition-colors',
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
      </aside>
    );
  }

  /* ─── Expanded state ─── */

  return (
    <aside
      className="flex flex-col h-full flex-shrink-0 app-ui bg-sidebar border-r border-sidebar transition-[width] duration-slow overflow-hidden"
      style={{ width: WIDTH_EXPANDED, padding: '16px 12px 12px' }}
    >
      {/* Header: brand + toggle */}
      <div className="flex items-center justify-between px-1 mb-4">
        <div className="flex items-baseline gap-[3px]">
          <span className="font-display text-[18px] font-medium text-primary tracking-[-0.4px]">
            relay
          </span>
          <span className="font-display text-[18px] font-light text-secondary tracking-[-0.4px]">
            pro
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="flex items-center justify-center w-7 h-7 rounded-md bg-transparent border-none cursor-pointer hover:bg-surface-hover transition-colors"
          aria-label="Collapse sidebar"
        >
          <IconSidebarToggle size={16} className="text-secondary" />
        </button>
      </div>

      {/* Action items (New task, Search) */}
      <div className="flex flex-col gap-[2px]">
        {actionItems.map((item) => {
          const isActive = activeNav === item.id;
          const hotkey = navHotkeys[item.id];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavChange?.(item.id)}
              className={[
                'group/nav w-full flex items-center gap-2.5 px-2 py-[6px] rounded-md border-none cursor-pointer text-[13.5px] transition-colors whitespace-nowrap',
                isActive
                  ? 'bg-border text-primary font-normal'
                  : 'bg-transparent text-primary hover:bg-surface-hover',
              ].join(' ')}
            >
              <span className="flex-shrink-0 text-secondary">{item.icon}</span>
              <span>{item.label}</span>
              {hotkey && (
                <span className="ml-auto opacity-0 group-hover/nav:opacity-100 transition-opacity duration-150">
                  <Hotkey keys={hotkey} compact />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Separator */}
      <div className="mx-1 my-3 h-px bg-sidebar-sep" />

      {/* Page nav items */}
      <div className="flex flex-col gap-[2px]">
        {pageItems.map((item) => {
          const isActive = activeNav === item.id;
          const hotkey = navHotkeys[item.id];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavChange?.(item.id)}
              className={[
                'group/nav w-full flex items-center gap-2.5 px-2 py-[6px] rounded-md border-none cursor-pointer text-[13.5px] transition-colors whitespace-nowrap',
                isActive
                  ? 'bg-border text-primary font-normal'
                  : 'bg-transparent text-primary hover:bg-surface-hover',
              ].join(' ')}
            >
              <span className="flex-shrink-0 text-secondary">{item.icon}</span>
              <span>{item.label}</span>
              {hotkey && (
                <span className="ml-auto opacity-0 group-hover/nav:opacity-100 transition-opacity duration-150">
                  <Hotkey keys={hotkey} compact />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Starred section */}
      {starred.length > 0 && (
        <>
          <div className="mx-1 my-3 h-px bg-sidebar-sep" />
          <div className="px-2 mb-1">
            <span className="text-[11.5px] font-medium tracking-wide uppercase text-sidebar-accent">
              Starred
            </span>
          </div>
          <div className="flex flex-col gap-[1px]">
            {starred.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => onSelectWorkflow?.(w.id, w.objective)}
                className="w-full flex items-center gap-2 px-2 py-[5px] rounded-md border-none bg-transparent cursor-pointer hover:bg-surface-hover transition-colors text-left"
              >
                <IconFolder size={14} className="text-secondary flex-shrink-0" />
                <span className="text-[13px] text-primary truncate">{w.objective || 'Untitled task'}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Recents section */}
      {recents.length > 0 && (
        <>
          <div className="mx-1 my-3 h-px bg-sidebar-sep" />
          <div className="px-2 mb-1">
            <span className="text-[11.5px] font-medium tracking-wide uppercase text-sidebar-accent">
              Recents
            </span>
          </div>
          <div className="flex flex-col gap-[1px] overflow-y-auto flex-1 min-h-0">
            {recents.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => onSelectWorkflow?.(w.id, w.objective)}
                className="w-full flex items-center px-2 py-[5px] rounded-md border-none bg-transparent cursor-pointer hover:bg-surface-hover transition-colors text-left"
              >
                <span className="text-[13px] text-secondary truncate">{w.objective || 'Untitled task'}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom: user profile + notifications */}
      <div className="flex items-center gap-2 mt-2">
        {/* User profile row */}
        <div ref={profileMenuRef} className="relative flex-1">
          <button
            type="button"
            onClick={() => setProfileMenuOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 px-1 py-1.5 rounded-lg border-none bg-transparent hover:bg-surface-hover transition-colors cursor-pointer"
            aria-label="Open account menu"
            aria-haspopup="menu"
            aria-expanded={profileMenuOpen}
          >
            {userAvatarUrl ? (
              <img
                src={userAvatarUrl}
                alt={displayName}
                className="w-7 h-7 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="flex items-center justify-center flex-shrink-0 w-7 h-7 rounded-full bg-avatar"
              >
                <span className="text-white text-[11px] font-medium">{avatarLetter}</span>
              </div>
            )}
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-[13px] font-medium text-primary truncate w-full text-left">{displayName}</span>
            </div>
            <IconChevronUpDown size={14} className="text-secondary flex-shrink-0" />
          </button>

          {/* Profile pop-up menu */}
          <div
            className={[
              'absolute left-0 bottom-full mb-2 min-w-[200px] bg-surface border border-border rounded-xl shadow-dropdown py-1.5 z-50 transition-all duration-150 origin-bottom-left',
              profileMenuOpen
                ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 scale-95 translate-y-1 pointer-events-none',
            ].join(' ')}
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-primary hover:bg-surface-hover transition-colors text-left border-none bg-transparent cursor-pointer"
            >
              {themeMode === 'dark' ? <IconSun size={15} className="text-secondary" /> : <IconMoon size={15} className="text-secondary" />}
              {themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>

            {onOpenSettings && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setProfileMenuOpen(false);
                  onOpenSettings();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-primary hover:bg-surface-hover transition-colors text-left border-none bg-transparent cursor-pointer"
              >
                <IconSettings size={15} className="text-secondary" />
                Settings
              </button>
            )}

            {isSignedIn && onSignOut && (
              <>
                <div className="mx-3 my-1 h-px bg-border" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    void onSignOut();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-primary hover:bg-surface-hover transition-colors text-left border-none bg-transparent cursor-pointer"
                >
                  <IconLogOut size={15} className="text-secondary" />
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>

        <NotificationCenter />
      </div>
    </aside>
  );
}
