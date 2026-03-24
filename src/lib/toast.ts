import { sileo } from 'sileo';

const INFO_DURATION_MS = 2200;
const SUCCESS_DURATION_MS = 2200;
const WARNING_DURATION_MS = 3200;
const ERROR_DURATION_MS = 4200;

export function toastInfo(title: string, description?: string) {
  sileo.info({
    title,
    duration: INFO_DURATION_MS,
    fill: '#f6f1e7',
    roundness: 22,
    styles: {
      title: 'relay-toast-title',
      description: 'relay-toast-description',
    },
    ...(description ? { description } : {}),
  });
}

export function toastSuccess(title: string, description?: string) {
  sileo.success({
    title,
    duration: SUCCESS_DURATION_MS,
    fill: '#edf7ef',
    roundness: 22,
    styles: {
      title: 'relay-toast-title',
      description: 'relay-toast-description',
    },
    ...(description ? { description } : {}),
  });
}

export function toastWarning(title: string, description?: string) {
  sileo.warning({
    title,
    duration: WARNING_DURATION_MS,
    fill: '#fbf2df',
    roundness: 22,
    styles: {
      title: 'relay-toast-title',
      description: 'relay-toast-description',
    },
    ...(description ? { description } : {}),
  });
}

export function toastError(title: string, description?: string) {
  sileo.error({
    title,
    duration: ERROR_DURATION_MS,
    fill: '#fbe9e7',
    roundness: 22,
    styles: {
      title: 'relay-toast-title',
      description: 'relay-toast-description',
    },
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
