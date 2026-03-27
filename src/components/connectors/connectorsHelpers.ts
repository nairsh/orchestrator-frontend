import type { ConnectorProvider, ConnectorRecord, ScheduledWorkflow } from '../../api/types';
import { IconGitHub, IconLinear, IconNotion } from '../icons/CustomIcons';
import { formatWhen } from '../../lib/time';

/* ─── Types ─── */

export type Tab = 'connectors' | 'schedules' | 'memory' | 'teams';
export type ScheduleType = 'interval';
export type IntervalUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

export const intervalUnits: IntervalUnit[] = ['minutes', 'hours', 'days', 'weeks', 'months'];

/* ─── Provider metadata ─── */

export const providerCopy: Record<
  ConnectorProvider,
  { title: string; eyebrow: string; description: string; accent: string; icon: React.FC<{ size?: number; className?: string }> }
> = {
  github: {
    title: 'GitHub',
    eyebrow: 'Engineering context',
    description: 'Give your AI access to your repos and organizations.',
    accent: 'from-[#d8f2e5] to-[#effaf4]',
    icon: IconGitHub,
  },
  linear: {
    title: 'Linear',
    eyebrow: 'Delivery context',
    description: 'Let your AI track your team\'s issues, cycles, and deliverables.',
    accent: 'from-[#dfe8ff] to-[#f4f6ff]',
    icon: IconLinear,
  },
  notion: {
    title: 'Notion',
    eyebrow: 'Knowledge context',
    description: 'Make your Notion workspace available as context for tasks and scheduled work.',
    accent: 'from-[#f0e5d6] to-[#faf5ee]',
    icon: IconNotion,
  },
};

export { TabPill } from './TabPill';

/* ─── Helper functions ─── */

export { formatWhen };

export function getConnectorSummary(connector: ConnectorRecord): string {
  if (connector.provider === 'github') {
    const login = typeof connector.metadata['login'] === 'string' ? connector.metadata['login'] : null;
    const repos = Array.isArray(connector.metadata['repositories']) ? connector.metadata['repositories'].length : 0;
    return [login, repos ? `${repos} repos` : null].filter(Boolean).join(' • ');
  }
  if (connector.provider === 'linear') {
    const viewer = connector.metadata['viewer'];
    const record = viewer && typeof viewer === 'object' && !Array.isArray(viewer) ? (viewer as Record<string, unknown>) : {};
    const email = typeof record['email'] === 'string' ? record['email'] : null;
    const teams = Array.isArray(connector.metadata['teams']) ? connector.metadata['teams'].length : 0;
    return [email, teams ? `${teams} teams` : null].filter(Boolean).join(' • ');
  }
  if (connector.provider === 'notion') {
    const name = typeof connector.metadata['workspace_name'] === 'string' ? connector.metadata['workspace_name'] : null;
    return name ?? connector.display_name;
  }
  return connector.display_name;
}

/**
 * Translate common cron expressions into plain language.
 * Falls back to "Custom schedule (expression)" for uncommon patterns.
 */
function humanizeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return `Custom schedule (${expr})`;
  const [min, hour, dom, mon, dow] = parts;

  // Every minute
  if (min === '*' && hour === '*' && dom === '*' && mon === '*' && dow === '*')
    return 'Every minute';

  // Every N minutes  (*/N * * * *)
  const everyNMin = min.match(/^\*\/(\d+)$/);
  if (everyNMin && hour === '*' && dom === '*' && mon === '*' && dow === '*')
    return `Every ${everyNMin[1]} minutes`;

  // Every hour at :MM  (MM * * * *)
  if (/^\d+$/.test(min) && hour === '*' && dom === '*' && mon === '*' && dow === '*')
    return Number(min) === 0 ? 'Every hour' : `Every hour at :${min.padStart(2, '0')}`;

  // Every N hours  (0 */N * * *)
  const everyNHour = hour.match(/^\*\/(\d+)$/);
  if (min === '0' && everyNHour && dom === '*' && mon === '*' && dow === '*')
    return `Every ${everyNHour[1]} hours`;

  // Daily at HH:MM  (MM HH * * *)
  if (/^\d+$/.test(min) && /^\d+$/.test(hour) && dom === '*' && mon === '*' && dow === '*') {
    const h = Number(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `Daily at ${h12}:${min.padStart(2, '0')} ${ampm}`;
  }

  return `Custom schedule (${expr})`;
}

export function getScheduleLabel(schedule: ScheduledWorkflow): string {
  if (schedule.schedule_type === 'interval') {
    return `Every ${schedule.interval_value} ${schedule.interval_unit}`;
  }
  if (schedule.cron_expression) return humanizeCron(schedule.cron_expression);
  return 'Custom schedule';
}
