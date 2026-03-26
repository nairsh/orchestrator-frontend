import { useRef, useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import { ActionIcon, Empty, Tooltip } from '@lobehub/ui';
import type { Notification } from '../hooks/useNotifications';
import { useNotifications } from '../hooks/useNotifications';
import { useClickOutside } from '../hooks/useClickOutside';

export interface NotificationCenterProps {
  notifications?: Notification[];
  unreadCount?: number;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onClearAll?: () => void;
  onClickNotification?: (notif: Notification) => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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
  useClickOutside(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <Tooltip title="Notifications">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="relative w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer"
          aria-label="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </Tooltip>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-surface rounded-xl shadow-2xl border border-border z-50 overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
            <span className="text-sm font-semibold text-primary">Notifications</span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Tooltip title="Mark all as read">
                  <ActionIcon onClick={onMarkAllAsRead} size="small" icon={CheckCheck} />
                </Tooltip>
              )}
              {notifications.length > 0 && (
                <Tooltip title="Clear all">
                  <ActionIcon onClick={onClearAll} size="small" icon={Trash2} />
                </Tooltip>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8">
                <Empty description="No notifications yet" />
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => {
                    onMarkAsRead(notif.id);
                    onClickNotification?.(notif);
                  }}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover border-b border-border-light/50 cursor-pointer ${
                    !notif.read ? 'bg-surface-tertiary/50' : ''
                  }`}
                >
                  <span className="text-base flex-shrink-0 mt-0.5">{notifIcon(notif.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium truncate ${notif.read ? 'text-secondary' : 'text-primary'}`}>
                        {notif.title}
                      </span>
                      {!notif.read && <div className="w-1.5 h-1.5 rounded-full bg-info flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted mt-0.5 line-clamp-2">{notif.message}</p>
                    <span className="text-2xs text-placeholder mt-1 block">{timeAgo(notif.timestamp)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
