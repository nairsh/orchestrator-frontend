import { createElement, type ReactNode } from 'react';
import { sileo } from 'sileo';
import { humanizeError } from './humanizeError';

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

function themeColors() {
  const dark = isDarkMode();
  return {
    dark,
    sub: dark ? '#b0aca6' : '#706b64',
    dim: dark ? '#8a8580' : '#918b84',
    trackBg: dark ? '#3a3836' : '#e8e5e0',
    fill: toastFill('#ffffff', '#282624'),
  };
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
    fill: themeColors().fill,
    ...(description ? { description } : {}),
  });
}

export function toastSuccess(title: string, description?: string) {
  sileo.success({
    ...TOAST_BASE,
    title,
    duration: SUCCESS_DURATION_MS,
    fill: themeColors().fill,
    ...(description ? { description } : {}),
  });
}

export function toastWarning(title: string, description?: string) {
  sileo.warning({
    ...TOAST_BASE,
    title,
    duration: WARNING_DURATION_MS,
    fill: themeColors().fill,
    ...(description ? { description } : {}),
  });
}

export function toastError(title: string, description?: string) {
  sileo.error({
    ...TOAST_BASE,
    title,
    duration: ERROR_DURATION_MS,
    fill: themeColors().fill,
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
    fill: themeColors().fill,
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
  const { sub, dim, trackBg, fill } = themeColors();

  // When no usage data, show a full bar in neutral color rather than a misleading percentage
  const hasUsage = used > 0;
  const rawPct = total > 0 ? (balance / total) * 100 : 100;
  const pct = hasUsage ? Math.min(Math.round(rawPct), 99) : 100;
  const barColor = !hasUsage ? '#6b8f71' : pct > 50 ? '#6b8f71' : pct > 20 ? '#c9a227' : '#c4573a';

  sileo.info({
    ...TOAST_BASE,
    title: `${balance.toFixed(0)} credits remaining`,
    duration: 6000,
    fill,
    description: createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' } },
      createElement('div', { style: { width: '100%', height: '6px', borderRadius: '3px', background: trackBg, overflow: 'hidden' } },
        createElement('div', { style: { width: `${pct}%`, height: '100%', borderRadius: '3px', background: barColor, transition: 'width 0.4s ease' } })
      ),
      hasUsage
        ? createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: sub } },
            createElement('span', null, `${Math.round(rawPct)}% remaining`),
            createElement('span', null, `${used.toFixed(1)} used · ${requests} req`)
          )
        : createElement('div', { style: { fontSize: '12px', color: sub } },
            'No usage this period'
          ),
      createElement('div', { style: { fontSize: '11px', color: dim } },
        `Plan: ${billing.tier}`
      )
    ),
  });
}

/** Task created toast — shows model and truncated objective */
export function toastTaskCreated(objective: string, model?: string) {
  const truncated = objective.length > 80 ? objective.slice(0, 80) + '…' : objective;
  const { sub, dim, fill } = themeColors();

  sileo.success({
    ...TOAST_BASE,
    title: 'Task started',
    duration: 3000,
    fill,
    description: createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' } },
      createElement('span', { style: { fontSize: '13px', color: sub, lineHeight: '1.4' } }, truncated),
      model
        ? createElement('span', { style: { fontSize: '11px', color: dim } }, `Model: ${model}`)
        : null,
    ),
  });
}

/** Connector status toast — shows connector name with status detail */
export function toastConnector(action: 'connected' | 'disconnected' | 'verified', connectorName: string) {
  const titles: Record<string, string> = {
    connected: 'Connected',
    disconnected: 'Disconnected',
    verified: 'Connection verified',
  };
  const { fill } = themeColors();
  const method = action === 'disconnected' ? 'info' : 'success';
  sileo[method]({
    ...TOAST_BASE,
    title: titles[action],
    duration: 2500,
    fill,
    description: connectorName,
  });
}

/** Settings saved toast — shows what section was saved */
export function toastSettingsSaved(section?: string) {
  const { sub, fill } = themeColors();
  sileo.success({
    ...TOAST_BASE,
    title: 'Settings saved',
    duration: 2000,
    fill,
    ...(section ? { description: createElement('span', { style: { fontSize: '12px', color: sub } }, section) } : {}),
  });
}

/** File upload toast — shows count and total size */
export function toastUploadComplete(count: number, totalBytes?: number) {
  const { sub, fill } = themeColors();
  const sizeStr = totalBytes
    ? totalBytes < 1024 ? `${totalBytes} B`
    : totalBytes < 1024 * 1024 ? `${(totalBytes / 1024).toFixed(1)} KB`
    : `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
    : null;

  sileo.success({
    ...TOAST_BASE,
    title: count === 1 ? 'Document uploaded' : `${count} documents uploaded`,
    duration: 2500,
    fill,
    ...(sizeStr ? {
      description: createElement('span', { style: { fontSize: '12px', color: sub } }, `Total size: ${sizeStr}`),
    } : {}),
  });
}

export function toastApiError(err: unknown, title = 'Something went wrong') {
  const raw = err instanceof Error ? err.message : String(err);
  const normalized = humanizeError(raw);
  toastError(title, normalized);
}

/** Workflow completed toast — shows duration and model */
export function toastWorkflowComplete(objective: string, durationStr?: string | null, model?: string) {
  const truncated = objective.length > 60 ? objective.slice(0, 60) + '…' : objective;
  const { sub, dim, fill } = themeColors();

  const details: ReactNode[] = [];
  if (durationStr) details.push(createElement('span', { key: 'd' }, `⏱ ${durationStr}`));
  if (model) details.push(createElement('span', { key: 'm' }, model));

  sileo.success({
    ...TOAST_BASE,
    title: 'Task completed',
    duration: 4000,
    fill,
    description: createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '2px' } },
      createElement('span', { style: { fontSize: '13px', color: sub, lineHeight: '1.4' } }, truncated),
      details.length > 0
        ? createElement('span', { style: { fontSize: '11px', color: dim, display: 'flex', gap: '8px' } }, ...details)
        : null,
    ),
  });
}

/** Workflow failed toast — shows humanized error */
export function toastWorkflowFailed(objective: string, error?: string) {
  const truncated = objective.length > 60 ? objective.slice(0, 60) + '…' : objective;
  const { sub, fill } = themeColors();
  const errorMsg = error ? humanizeError(error) : 'An unexpected error occurred';

  sileo.error({
    ...TOAST_BASE,
    title: 'Task failed',
    duration: 5000,
    fill,
    description: createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '2px' } },
      createElement('span', { style: { fontSize: '13px', color: sub, lineHeight: '1.4' } }, truncated),
      createElement('span', { style: { fontSize: '12px', color: '#c4573a' } }, errorMsg),
    ),
  });
}

// Debug: expose toast functions for browser console testing
declare global {
  interface Window {
    __toast?: typeof devToastExports;
  }
}
const devToastExports = { toastInfo, toastSuccess, toastWarning, toastError, toastRich, toastCredits, toastTaskCreated, toastConnector, toastSettingsSaved, toastUploadComplete, toastWorkflowComplete, toastWorkflowFailed, sileo };
if (import.meta.env.DEV) {
  window.__toast = devToastExports;
}
