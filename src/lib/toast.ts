import { sileo } from 'sileo';

const INFO_DURATION_MS = 2200;
const SUCCESS_DURATION_MS = 2200;
const WARNING_DURATION_MS = 3200;
const ERROR_DURATION_MS = 4200;

function isDarkMode(): boolean {
  return document.documentElement.getAttribute('data-theme') !== 'light';
}

function toastFill(lightFill: string, darkFill: string): string {
  return isDarkMode() ? darkFill : lightFill;
}

const TOAST_BASE = {
  roundness: 20,
  styles: {
    title: 'relay-toast-title',
    description: 'relay-toast-description',
  },
};

export function toastInfo(title: string, description?: string) {
  sileo.info({
    ...TOAST_BASE,
    title,
    duration: INFO_DURATION_MS,
    fill: toastFill('#ffffff', '#282624'),
    ...(description ? { description } : {}),
  });
}

export function toastSuccess(title: string, description?: string) {
  sileo.success({
    ...TOAST_BASE,
    title,
    duration: SUCCESS_DURATION_MS,
    fill: toastFill('#ffffff', '#282624'),
    ...(description ? { description } : {}),
  });
}

export function toastWarning(title: string, description?: string) {
  sileo.warning({
    ...TOAST_BASE,
    title,
    duration: WARNING_DURATION_MS,
    fill: toastFill('#ffffff', '#282624'),
    ...(description ? { description } : {}),
  });
}

export function toastError(title: string, description?: string) {
  sileo.error({
    ...TOAST_BASE,
    title,
    duration: ERROR_DURATION_MS,
    fill: toastFill('#ffffff', '#282624'),
    ...(description ? { description } : {}),
  });
}

export function toastApiError(err: unknown, title = 'Request failed') {
  const raw = err instanceof Error ? err.message : String(err);
  const normalized = normalizeAuthError(raw);
  toastError(title, normalized);
}

function normalizeAuthError(message: string): string {
  const lowered = message.toLowerCase();
  if (
    lowered.includes('invalid api key') ||
    lowered.includes('invalid or missing api key') ||
    lowered.includes('invalid or expired clerk token') ||
    lowered.includes('invalid auth token') ||
    lowered.includes('missing authentication token')
  ) {
    return 'Sign in with Clerk to continue.';
  }
  return message;
}

// Debug: expose toast functions for browser console testing
if (import.meta.env.DEV) {
  (window as any).__toast = { toastInfo, toastSuccess, toastWarning, toastError, sileo };
}
