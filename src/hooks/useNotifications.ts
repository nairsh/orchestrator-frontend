import { useCallback, useEffect, useRef, useState } from 'react';

export interface Notification {
  id: string;
  type: 'workflow_complete' | 'workflow_failed' | 'approval_needed' | 'schedule_run' | 'info';
  title: string;
  message: string;
  workflowId?: string;
  read: boolean;
  timestamp: number;
}

const STORAGE_KEY = 'relay:notifications';
const MAX_NOTIFICATIONS = 50;

function loadNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotifications(notifications: Notification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(loadNotifications);
  const notifRef = useRef(notifications);
  notifRef.current = notifications;

  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  const addNotification = useCallback((notif: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
    const newNotif: Notification = {
      ...notif,
      id: crypto.randomUUID(),
      read: false,
      timestamp: Date.now(),
    };
    setNotifications((prev) => [newNotif, ...prev].slice(0, MAX_NOTIFICATIONS));
    return newNotif;
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, addNotification, markAsRead, markAllAsRead, clearAll, unreadCount };
}
