import { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { ActionIcon, Tooltip } from '@lobehub/ui';
import { RelayEmpty } from './shared/RelayEmpty';
import type { Notification } from '../hooks/useNotifications';
import { useNotifications } from '../hooks/useNotifications';
import { relativeTimeAgo } from '../lib/time';

export interface NotificationCenterProps {
  notifications?: Notification[];
  unreadCount?: number;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onClearAll?: () => void;
  onClickNotification?: (notif: Notification) => void;
}

function notifIcon(type: Notification['type']) {
  switch (type) {
    case 'workflow_complete': return '✅';
    case 'workflow_failed': return '❌';
    case 'approval_needed': return '⚠️';
    case 'schedule_run': return '🔄';
    default: return 'ℹ️';
  }
}

export function NotificationCenter(props: NotificationCenterProps) {
  const hookState = useNotifications();
  const notifications = props.notifications ?? hookState.notifications;
  const unreadCount = props.unreadCount ?? hookState.unreadCount;
  const onMarkAsRead = props.onMarkAsRead ?? hookState.markAsRead;
  const onMarkAllAsRead = props.onMarkAllAsRead ?? hookState.markAllAsRead;
  const onClearAll = props.onClearAll ?? hookState.clearAll;
  const onClickNotification = props.onClickNotification;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Close dropdown when clicking outside both the button and the portal dropdown
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Position the dropdown relative to the button using a portal
  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const dropdownWidth = 320; // w-80 = 20rem = 320px
    // Clamp left so dropdown stays within viewport
    const maxLeft = window.innerWidth - dropdownWidth - 8;
    const clampedLeft = Math.max(8, Math.min(rect.left, maxLeft));
    setDropdownStyle({
      position: 'fixed',
      left: clampedLeft,
      bottom: window.innerHeight - rect.top + 4,
      zIndex: 9999,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  return (
    <div ref={ref} className="relative">
      <Tooltip title="Notifications">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen(!open)}
          className="relative w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-primary hover:bg-surface-hover transition-colors duration-200 cursor-pointer"
          aria-label="Notifications"
          aria-expanded={open}
          aria-haspopup="true"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center px-0.5">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </Tooltip>

      {open && createPortal(
        <div ref={dropdownRef} className="w-80 bg-surface rounded-xl shadow-modal border border-border-light overflow-hidden animate-scale-in" style={dropdownStyle}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
            <span className="text-sm font-semibold text-primary">Notifications</span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Tooltip title="Mark all as read">
                  <ActionIcon onClick={onMarkAllAsRead} size="small" icon={CheckCheck} title="Mark all as read" />
                </Tooltip>
              )}
              {notifications.length > 0 && (
                <Tooltip title="Clear all">
                  <ActionIcon onClick={onClearAll} size="small" icon={Trash2} title="Clear all notifications" />
                </Tooltip>
              )}
            </div>
          </div>

          {/* List */}
          <ul className="max-h-[360px] overflow-y-auto list-none m-0 p-0">
            {notifications.length === 0 ? (
              <li><RelayEmpty icon={<Bell size={24} className="text-muted" />} description="No notifications yet" className="py-8" /></li>
            ) : (
              notifications.map((notif) => (
                <li key={notif.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onMarkAsRead(notif.id);
                      onClickNotification?.(notif);
                      setOpen(false);
                    }}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-surface-hover border-b border-border-light/50 cursor-pointer ${
                      !notif.read ? 'bg-surface-tertiary/50' : ''
                    }`}
                  >
                    <span className="text-base flex-shrink-0 mt-0.5">{notifIcon(notif.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium line-clamp-2 ${notif.read ? 'text-secondary' : 'text-primary'}`}>
                          {notif.title}
                        </span>
                        {!notif.read && <div className="w-1.5 h-1.5 rounded-full bg-info flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-muted mt-0.5 line-clamp-2">{notif.message}</p>
                      <span className="text-2xs text-placeholder mt-1 block">{relativeTimeAgo(notif.timestamp)}</span>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}
