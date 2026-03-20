import { sileo } from 'sileo';

const INFO_DURATION_MS = 2200;
const SUCCESS_DURATION_MS = 2200;
const WARNING_DURATION_MS = 3200;
const ERROR_DURATION_MS = 4200;

export function toastInfo(title: string, description?: string) {
  sileo.info({
    title,
    duration: INFO_DURATION_MS,
    ...(description ? { description } : {}),
  });
}

export function toastSuccess(title: string, description?: string) {
  sileo.success({
    title,
    duration: SUCCESS_DURATION_MS,
    ...(description ? { description } : {}),
  });
}

export function toastWarning(title: string, description?: string) {
  sileo.warning({
    title,
    duration: WARNING_DURATION_MS,
    ...(description ? { description } : {}),
  });
}

export function toastError(title: string, description?: string) {
  sileo.error({
    title,
    duration: ERROR_DURATION_MS,
    ...(description ? { description } : {}),
  });
}

export function toastApiError(err: unknown, title = 'Request failed') {
  const message = err instanceof Error ? err.message : String(err);
  toastError(title, message);
}
