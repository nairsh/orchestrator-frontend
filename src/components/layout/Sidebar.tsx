import { useEffect, useRef, useState } from 'react';
import { Plus, CircleCheck, FileText, Plug, Blocks, Settings, LogOut, Menu, PanelLeftClose, Moon, Sun } from 'lucide-react';
import type { ApiConfig } from '../../api/client';
import { useClickOutside } from '../../hooks/useClickOutside';

type NavId = 'search' | 'tasks' | 'files' | 'connectors' | 'skills';

interface NavItem {
  id: NavId;
  label: string;
  icon: React.ReactNode;
}

const ICON_SIZE = 18;

const getNavItems = (): NavItem[] => [
  { id: 'search',     label: 'New',        icon: <Plus size={ICON_SIZE} strokeWidth={1.75} /> },
  { id: 'tasks',      label: 'Tasks',      icon: <CircleCheck size={ICON_SIZE} strokeWidth={1.75} /> },
  { id: 'files',      label: 'Files',      icon: <FileText size={ICON_SIZE} strokeWidth={1.75} /> },
  { id: 'connectors', label: 'Connectors', icon: <Plug size={ICON_SIZE} strokeWidth={1.75} /> },
  { id: 'skills',     label: 'Skills',     icon: <Blocks size={ICON_SIZE} strokeWidth={1.75} /> },
];

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
}

export function Sidebar({
  activeNav = 'tasks',
  onNavChange,
  config,
  onOpenSettings,
  onSignOut,
  isSignedIn = false,
  userLabel,
  userAvatarUrl,
  collapsed: collapsedProp,
  onCollapsedChange,
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = collapsedProp !== undefined ? collapsedProp : internalCollapsed;
  const setCollapsed = (value: boolean) => {
    if (onCollapsedChange) {
      onCollapsedChange(value);
    } else {
      setInternalCollapsed(value);
    }
  };
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('relay-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    const activeTheme = document.documentElement.getAttribute('data-theme');
    return activeTheme === 'light' ? 'light' : 'dark';
  });
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useClickOutside(profileMenuRef, () => setProfileMenuOpen(false), !collapsed);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    document.documentElement.classList.toggle('dark', themeMode === 'dark');
    localStorage.setItem('relay-theme', themeMode);
  }, [themeMode]);

  const navItems = getNavItems();
  const displayName = userLabel?.trim() || (isSignedIn ? 'User' : 'Guest');
  const avatarLetter = displayName[0]?.toUpperCase() ?? 'U';

  return (
    <aside
      className="flex flex-col h-full flex-shrink-0 app-ui justify-between bg-sidebar border-r border-sidebar transition-[width] duration-slow"
      style={{
        width: collapsed ? 44 : 192,
        padding: collapsed ? '12px 0' : '20px 14px',
        overflow: 'visible',
      }}
    >
      {/* Top nav */}
      <div className="flex flex-col gap-1">
        {collapsed ? (
          <div className="group relative flex items-center justify-center">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="flex items-center justify-center flex-shrink-0 h-12 w-12 bg-transparent border-none cursor-pointer"
            >
              <Menu size={16} className="text-primary" strokeWidth={1.75} />
            </button>
            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-surface-secondary border border-border text-primary text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-slow whitespace-nowrap z-50 pointer-events-none">
              Menu
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between px-2 pb-2">
            <div className="flex items-baseline gap-0.5">
              <span className="font-sans text-xl font-medium text-primary" style={{ letterSpacing: -0.6 }}>relay</span>
              <span className="font-sans text-xl font-light text-secondary" style={{ letterSpacing: -0.6 }}>pro</span>
            </div>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-sm bg-transparent border-none cursor-pointer"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={18} className="text-primary" strokeWidth={1.75} />
            </button>
          </div>
        )}

        {navItems.map((item, idx) => {
          const isActive = activeNav === item.id;
          const isSearch = item.id === 'search';

          if (collapsed) {
            return (
              <div key={item.id} className={`group relative flex items-center justify-center ${isSearch ? 'mb-3' : ''}`}>
                <button
                  type="button"
                  onClick={() => onNavChange?.(item.id)}
                  className={[
                    'flex items-center justify-center cursor-pointer transition-colors duration-150',
                    isSearch
                      ? 'h-8 w-8 mx-auto bg-surface border border-border rounded-md shadow-xs'
                      : 'h-8 w-full bg-transparent border-none rounded-none',
                  ].join(' ')}
                >
                  <span className={isSearch ? 'text-primary' : 'text-primary'}>{item.icon}</span>
                </button>
                {/* Tooltip */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-surface-secondary border border-border text-primary text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-slow whitespace-nowrap z-50 pointer-events-none">
                  {item.label}
                </div>
              </div>
            );
          }

          return (
            <div key={item.id}>
              <button
                type="button"
                onClick={() => onNavChange?.(item.id)}
                className={[
                  'w-full flex items-center gap-3 cursor-pointer font-sans text-base transition-colors duration-150 whitespace-nowrap',
                  isSearch
                    ? 'px-3 py-1.5 rounded-md bg-surface border border-border shadow-xs font-medium text-primary'
                    : `px-2.5 py-2 rounded-sm bg-transparent border-none ${isActive ? 'font-medium' : 'font-normal'} text-primary`,
                ].join(' ')}
              >
                <span className="text-primary flex-shrink-0">{item.icon}</span>
                <span className={`transition-opacity duration-150 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>{item.label}</span>
              </button>
              {isSearch && idx === 0 && <div className="h-4" />}
            </div>
          );
        })}
      </div>

      {/* Bottom: user profile */}
      {!collapsed && (
        <div className="flex flex-col gap-4">
          <div ref={profileMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((v) => !v)}
              className="w-full flex items-center gap-2.5 px-1.5 py-1.5 rounded-md border-none bg-transparent hover:bg-surface-hover transition-colors duration-150"
              aria-label="Open account menu"
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
            >
              {userAvatarUrl ? (
                <img
                  src={userAvatarUrl}
                  alt={displayName}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-full bg-ink">
                  <span className="text-primary text-xs font-sans font-medium">{avatarLetter}</span>
                </div>
              )}
              <span className="font-sans text-sm font-medium text-primary truncate text-left">{displayName}</span>
            </button>

            <div
              className={[
                'absolute left-0 bottom-full mb-2 min-w-[172px] bg-surface border border-border rounded-lg shadow-dropdown py-1 z-50 transition-all duration-150 origin-bottom-left',
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
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-ui-secondary text-primary hover:bg-surface-hover transition-colors duration-150 text-left"
              >
                {themeMode === 'dark' ? <Sun size={14} className="text-muted" /> : <Moon size={14} className="text-muted" />}
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
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-ui-secondary text-primary hover:bg-surface-hover transition-colors duration-150 text-left"
                >
                  <Settings size={14} className="text-muted" />
                  Settings
                </button>
              )}

              {isSignedIn && onSignOut && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    void onSignOut();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-ui-secondary text-primary hover:bg-surface-hover transition-colors duration-150 text-left"
                >
                  <LogOut size={14} className="text-muted" />
                  Sign out
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
