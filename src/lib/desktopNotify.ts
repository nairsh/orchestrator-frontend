/** Desktop notification helper. Shows native browser notifications when tab is hidden. */

let permissionState: NotificationPermission = typeof Notification !== 'undefined' ? Notification.permission : 'denied';

/** Request permission proactively (call once on app mount or first interaction) */
export function requestNotificationPermission() {
  if (typeof Notification === 'undefined') return;
  if (permissionState === 'default') {
    void Notification.requestPermission().then((p) => { permissionState = p; });
  }
}

/** Send a desktop notification if the tab is not focused */
export function desktopNotify(title: string, body?: string, onClick?: () => void) {
  if (typeof Notification === 'undefined') return;
  if (permissionState !== 'granted') return;
  if (document.hasFocus()) return; // Don't notify if user is actively looking at the app

  try {
    const n = new Notification(title, { body, icon: '/favicon.svg', tag: title });
    if (onClick) {
      n.onclick = () => { window.focus(); onClick(); n.close(); };
    }
  } catch { /* Notification API not available in this context */ }
}
