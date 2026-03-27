export function parseApiTimestampMs(value: string | null | undefined): number | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const hasTimezone = /(?:Z|[+\-]\d{2}:?\d{2})$/i.test(trimmed);
  const normalized = hasTimezone
    ? trimmed
    : `${trimmed.replace(' ', 'T')}Z`;

  const ms = new Date(normalized).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export type DateGroup = 'Today' | 'Yesterday' | 'Previous 7 days' | 'This month' | 'Earlier';

/** Classify a timestamp (ms) into a human-friendly date group relative to now. */
export function dateGroupLabel(timestampMs: number, nowMs: number): DateGroup {
  const d = new Date(timestampMs);
  const now = new Date(nowMs);

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86_400_000;
  const startOf7DaysAgo = startOfToday - 6 * 86_400_000;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const ts = d.getTime();
  if (ts >= startOfToday) return 'Today';
  if (ts >= startOfYesterday) return 'Yesterday';
  if (ts >= startOf7DaysAgo) return 'Previous 7 days';
  if (ts >= startOfMonth) return 'This month';
  return 'Earlier';
}

const DATE_GROUP_ORDER: DateGroup[] = ['Today', 'Yesterday', 'Previous 7 days', 'This month', 'Earlier'];

export interface GroupedItems<T> { label: string; items: T[] }

/**
 * Group a sorted array of items by date period.
 * Items with `isPinned` true are placed in a "Pinned" group at the top.
 */
export function groupByDate<T>(
  items: T[],
  getTimestamp: (item: T) => number | null,
  isPinned: (item: T) => boolean,
  nowMs: number,
): GroupedItems<T>[] {
  const pinned: T[] = [];
  const buckets = new Map<DateGroup, T[]>();

  for (const item of items) {
    if (isPinned(item)) {
      pinned.push(item);
      continue;
    }
    const ts = getTimestamp(item);
    const label = ts != null ? dateGroupLabel(ts, nowMs) : 'Earlier';
    const arr = buckets.get(label);
    if (arr) arr.push(item);
    else buckets.set(label, [item]);
  }

  const groups: GroupedItems<T>[] = [];
  if (pinned.length > 0) groups.push({ label: 'Pinned', items: pinned });
  for (const label of DATE_GROUP_ORDER) {
    const arr = buckets.get(label);
    if (arr && arr.length > 0) groups.push({ label, items: arr });
  }
  return groups;
}
