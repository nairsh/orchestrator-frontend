import { useEffect, useRef, useState } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { NotificationCenter } from '../NotificationCenter';
import {
  IconSettings, IconSun, IconMoon, IconLogOut, IconChevronUpDown,
} from '../icons/CustomIcons';

interface SidebarAccountProps {
  isSignedIn: boolean;
  userLabel?: string | null;
  userAvatarUrl?: string | null;
  onOpenSettings?: () => void;
  onSignOut?: () => Promise<void>;
}

export function SidebarAccount({ isSignedIn, userLabel, userAvatarUrl, onOpenSettings, onSignOut }: SidebarAccountProps) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('relay-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  });
  const profileMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(profileMenuRef, () => setProfileMenuOpen(false));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    document.documentElement.classList.toggle('dark', themeMode === 'dark');
    localStorage.setItem('relay-theme', themeMode);
  }, [themeMode]);

  const displayName = userLabel?.trim() || (isSignedIn ? 'User' : 'Guest');
  const avatarLetter = displayName[0]?.toUpperCase() ?? 'U';

  return (
    <div className="flex items-center gap-2 mt-2">
      <div ref={profileMenuRef} className="relative flex-1">
        <button
          type="button"
          onClick={() => setProfileMenuOpen((v) => !v)}
          className="w-full flex items-center gap-2.5 px-1.5 py-1.5 rounded-xl border-none bg-transparent hover:bg-surface-hover transition-colors duration-200 cursor-pointer"
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
            <div className="flex items-center justify-center flex-shrink-0 w-7 h-7 rounded-full bg-avatar">
              <span className="text-white text-[11px] font-medium">{avatarLetter}</span>
            </div>
          )}
          <div className="flex flex-col items-start min-w-0 flex-1">
            <span className="text-[13px] font-medium text-primary truncate w-full text-left">{displayName}</span>
          </div>
          <IconChevronUpDown size={14} className="text-muted flex-shrink-0" />
        </button>

        {/* Profile pop-up menu */}
        <div
          className={[
            'absolute left-0 bottom-full mb-2 min-w-[200px] bg-surface border border-border-light rounded-xl shadow-dropdown py-1.5 z-50 transition-all duration-200 origin-bottom-left',
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
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-primary hover:bg-surface-hover transition-colors duration-200 text-left border-none bg-transparent cursor-pointer rounded-lg"
          >
            {themeMode === 'dark' ? <IconSun size={15} className="text-muted" /> : <IconMoon size={15} className="text-muted" />}
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
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-primary hover:bg-surface-hover transition-colors duration-200 text-left border-none bg-transparent cursor-pointer rounded-lg"
            >
              <IconSettings size={15} className="text-muted" />
              Settings
            </button>
          )}

          {isSignedIn && onSignOut && (
            <>
              <div className="mx-3 my-1 h-px bg-border-subtle" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setProfileMenuOpen(false);
                  void onSignOut();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-primary hover:bg-surface-hover transition-colors duration-200 text-left border-none bg-transparent cursor-pointer rounded-lg"
              >
                <IconLogOut size={15} className="text-muted" />
                Sign out
              </button>
            </>
          )}
        </div>
      </div>

      <NotificationCenter
        onClickNotification={(notif) => {
          if (notif.workflowId) {
            window.dispatchEvent(new CustomEvent('relay:select-workflow', {
              detail: { id: notif.workflowId, objective: notif.message },
            }));
          }
        }}
      />
    </div>
  );
}
