import type { ConnectorProvider, ConnectorRecord, ScheduledWorkflow } from '../../api/types';
import { IconGitHub, IconLinear, IconNotion } from '../icons/CustomIcons';

/* ─── Types ─── */

export type Tab = 'connectors' | 'schedules' | 'templates' | 'memory' | 'teams';
export type ScheduleType = 'cron' | 'interval';
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
    description: 'Repos, organizations, and account metadata become available to connected workflows.',
    accent: 'from-[#d8f2e5] to-[#effaf4]',
    icon: IconGitHub,
  },
  linear: {
    title: 'Linear',
    eyebrow: 'Delivery context',
    description: 'Team issues, cycles, and assignees feed execution planning and recurring sweeps.',
    accent: 'from-[#dfe8ff] to-[#f4f6ff]',
    icon: IconLinear,
  },
  notion: {
    title: 'Notion',
    eyebrow: 'Knowledge context',
    description: 'Workspace knowledge, specs, and docs are ready to join prompts and memory.',
    accent: 'from-[#f0e5d6] to-[#faf5ee]',
    icon: IconNotion,
  },
};

export { TabPill } from './TabPill';

/* ─── Helper functions ─── */

export function formatWhen(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

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

export function getScheduleLabel(schedule: ScheduledWorkflow): string {
  if (schedule.schedule_type === 'interval') {
    return `Every ${schedule.interval_value} ${schedule.interval_unit}`;
  }
  return schedule.cron_expression ?? 'Custom cron';
}
