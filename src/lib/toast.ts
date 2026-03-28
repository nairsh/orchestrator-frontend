import { createElement, type ReactNode } from 'react';
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

/** Rich toast with custom ReactNode description and optional action button */
export function toastRich(opts: {
  title: string;
  body: ReactNode;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  button?: { title: string; onClick: () => void };
}) {
  const method = opts.type ?? 'info';
  sileo[method]({
    ...TOAST_BASE,
    title: opts.title,
    description: opts.body,
    duration: opts.duration ?? 5000,
    fill: toastFill('#ffffff', '#282624'),
    ...(opts.button ? { button: opts.button } : {}),
  });
}

/** Credits toast with progress bar and usage breakdown */
export function toastCredits(billing: {
  tier: string;
  credits_balance: number;
  usage_this_period?: { credits_used: number; request_count: number };
}) {
  const balance = billing.credits_balance;
  const used = billing.usage_this_period?.credits_used ?? 0;
  const requests = billing.usage_this_period?.request_count ?? 0;
  const total = balance + used;
  const rawPct = total > 0 ? (balance / total) * 100 : 100;
  const pct = used > 0 ? Math.min(Math.round(rawPct), 99) : Math.round(rawPct);
  const hasUsage = used > 0;
  const dark = isDarkMode();
  const sub = dark ? '#b0aca6' : '#706b64';
  const dim = dark ? '#8a8580' : '#918b84';
  const trackBg = dark ? '#3a3836' : '#e8e5e0';
  const barColor = pct > 50 ? '#6b8f71' : pct > 20 ? '#c9a227' : '#c4573a';

  sileo.info({
    ...TOAST_BASE,
    title: `${balance.toFixed(0)} credits remaining`,
    duration: 6000,
    fill: toastFill('#ffffff', '#282624'),
    description: createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' } },
      // Progress bar
      createElement('div', { style: { width: '100%', height: '6px', borderRadius: '3px', background: trackBg, overflow: 'hidden' } },
        createElement('div', { style: { width: `${pct}%`, height: '100%', borderRadius: '3px', background: barColor, transition: 'width 0.4s ease' } })
      ),
      // Stats row
      hasUsage
        ? createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: sub } },
            createElement('span', null, `${pct}% remaining`),
            createElement('span', null, `${used.toFixed(0)} used · ${requests} requests`)
          )
        : createElement('div', { style: { fontSize: '12px', color: sub } },
            `${balance.toFixed(0)} credits available`
          ),
      // Plan tier
      createElement('div', { style: { fontSize: '11px', color: dim } },
        `Plan: ${billing.tier}`
      )
    ),
  });
}

export function toastApiError(err: unknown, title = 'Something went wrong') {
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
    return 'Please sign in to continue.';
  }
  return message;
}

// Debug: expose toast functions for browser console testing
declare global {
  interface Window {
    __toast?: typeof devToastExports;
  }
}
const devToastExports = { toastInfo, toastSuccess, toastWarning, toastError, toastRich, toastCredits, sileo };
if (import.meta.env.DEV) {
  window.__toast = devToastExports;
}
