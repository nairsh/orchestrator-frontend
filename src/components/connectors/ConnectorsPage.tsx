import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Clock3, DatabaseZap, GitBranch, Loader2, Orbit, RefreshCcw, Sparkles } from 'lucide-react';
import type { ApiConfig, CreateScheduleInput } from '../../api/client';
import {
  createSchedule,
  createWorkflow,
  deleteMemory,
  deleteSchedule,
  disconnectConnector,
  listConnectorProviders,
  listConnectors,
  listMemories,
  listSchedules,
  listTeams,
  listTemplates,
  saveMemory,
  startConnectorOAuth,
  updateSchedule,
  useTemplate,
  validateConnector,
} from '../../api/client';
import type {
  ConnectorProvider,
  ConnectorProviderInfo,
  ConnectorRecord,
  Memory,
  ScheduledWorkflow,
  WorkflowTemplate,
} from '../../api/types';
import { toastApiError, toastInfo, toastSuccess, toastWarning } from '../../lib/toast';
import { Button, Card, Input, Textarea } from '../ui';

type Tab = 'connectors' | 'schedules' | 'templates' | 'memory' | 'teams';
type ScheduleType = 'cron' | 'interval';
type IntervalUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

interface ConnectorsPageProps {
  config: ApiConfig;
  onWorkflowStarted?: (workflowId: string, objective: string) => void;
}

const providerCopy: Record<
  ConnectorProvider,
  { title: string; eyebrow: string; description: string; accent: string; icon: typeof GitBranch }
> = {
  github: {
    title: 'GitHub',
    eyebrow: 'Engineering context',
    description: 'Repos, organizations, and account metadata become available to connected workflows.',
    accent: 'from-[#d8f2e5] to-[#effaf4]',
    icon: GitBranch,
  },
  linear: {
    title: 'Linear',
    eyebrow: 'Delivery context',
    description: 'Team issues, cycles, and assignees feed execution planning and recurring sweeps.',
    accent: 'from-[#dfe8ff] to-[#f4f6ff]',
    icon: Orbit,
  },
  notion: {
    title: 'Notion',
    eyebrow: 'Knowledge context',
    description: 'Workspace knowledge, specs, and docs are ready to join prompts and memory.',
    accent: 'from-[#f0e5d6] to-[#faf5ee]',
    icon: DatabaseZap,
  },
};

const intervalUnits: IntervalUnit[] = ['minutes', 'hours', 'days', 'weeks', 'months'];

function TabPill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150',
        active ? 'border-border bg-surface text-primary shadow-sm' : 'border-border-light bg-surface-secondary text-secondary hover:bg-surface',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function formatWhen(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function getConnectorSummary(connector: ConnectorRecord): string {
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

function getScheduleLabel(schedule: ScheduledWorkflow): string {
  if (schedule.schedule_type === 'interval') {
    return `Every ${schedule.interval_value} ${schedule.interval_unit}`;
  }
  return schedule.cron_expression ?? 'Custom cron';
}

export function ConnectorsPage({ config, onWorkflowStarted }: ConnectorsPageProps) {
  const [tab, setTab] = useState<Tab>('connectors');

  const [providers, setProviders] = useState<ConnectorProviderInfo[]>([]);
  const [connectors, setConnectors] = useState<ConnectorRecord[]>([]);
  const [connectorsLoading, setConnectorsLoading] = useState(false);
  const [connectorBusyId, setConnectorBusyId] = useState<string | null>(null);
  const [connectorBusyProvider, setConnectorBusyProvider] = useState<ConnectorProvider | null>(null);

  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateObjective, setTemplateObjective] = useState('');

  const [schedules, setSchedules] = useState<ScheduledWorkflow[]>([]);
  const [scheduleType, setScheduleType] = useState<ScheduleType>('cron');
  const [scheduleCron, setScheduleCron] = useState('0 * * * *');
  const [scheduleIntervalValue, setScheduleIntervalValue] = useState('6');
  const [scheduleIntervalUnit, setScheduleIntervalUnit] = useState<IntervalUnit>('hours');
  const [scheduleTimezone, setScheduleTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [scheduleObjective, setScheduleObjective] = useState('');
  const [scheduleWorkingDirectory, setScheduleWorkingDirectory] = useState('');
  const [scheduleOverlapPolicy, setScheduleOverlapPolicy] = useState<'skip' | 'queue'>('skip');
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoryKey, setMemoryKey] = useState('');
  const [memoryCategory, setMemoryCategory] = useState('general');
  const [memoryContent, setMemoryContent] = useState('');
  const [memoriesLoading, setMemoriesLoading] = useState(false);

  const [teamsStatus, setTeamsStatus] = useState<'idle' | 'loading' | 'disabled' | 'ready'>('idle');
  const [teams, setTeams] = useState<Array<Record<string, unknown>>>([]);

  const canUseApi = useMemo(() => Boolean(config.hasAuth), [config.hasAuth]);

  const refreshConnectors = async () => {
    if (!canUseApi) return;
    setConnectorsLoading(true);
    try {
      const [providerRes, connectorRes] = await Promise.all([listConnectorProviders(config), listConnectors(config)]);
      setProviders(providerRes.providers ?? []);
      setConnectors(connectorRes.connectors ?? []);
    } catch (err) {
      toastApiError(err, 'Failed to load connectors');
    } finally {
      setConnectorsLoading(false);
    }
  };

  const refreshTemplates = async () => {
    if (!canUseApi) return;
    setTemplatesLoading(true);
    try {
      const res = await listTemplates(config);
      setTemplates(res.templates ?? []);
    } catch (err) {
      toastApiError(err, 'Failed to load templates');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const refreshSchedules = async () => {
    if (!canUseApi) return;
    setSchedulesLoading(true);
    try {
      const res = await listSchedules(config);
      setSchedules(res.schedules ?? []);
    } catch (err) {
      toastApiError(err, 'Failed to load schedules');
    } finally {
      setSchedulesLoading(false);
    }
  };

  const refreshMemories = async () => {
    if (!canUseApi) return;
    setMemoriesLoading(true);
    try {
      const res = await listMemories(config);
      setMemories(res.memories ?? []);
    } catch (err) {
      toastApiError(err, 'Failed to load memory');
    } finally {
      setMemoriesLoading(false);
    }
  };

  const refreshTeams = async () => {
    if (!canUseApi) return;
    setTeamsStatus('loading');
    try {
      const res = await listTeams(config);
      setTeams(res.teams ?? []);
      setTeamsStatus('ready');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('feature') || msg.toLowerCase().includes('not enabled') || msg.includes('404')) {
        setTeamsStatus('disabled');
        return;
      }
      setTeamsStatus('idle');
      toastApiError(err, 'Failed to load teams');
    }
  };

  useEffect(() => {
    if (!canUseApi) return;
    if (tab === 'connectors') void refreshConnectors();
    if (tab === 'templates') void refreshTemplates();
    if (tab === 'schedules') void refreshSchedules();
    if (tab === 'memory') void refreshMemories();
    if (tab === 'teams') void refreshTeams();
  }, [tab, canUseApi, config.baseUrl, config.hasAuth]);

  const connectorCards = useMemo(
    () =>
      providers.map((provider) => ({
        provider,
        connector:
          connectors.find((connector) => connector.provider === provider.provider && connector.status !== 'disconnected') ?? null,
      })),
    [providers, connectors]
  );

  const createSchedulePayload = (): CreateScheduleInput | null => {
    const objective = scheduleObjective.trim();
    if (!objective) {
      toastWarning('Objective required', 'Describe what the schedule should do.');
      return null;
    }

    if (scheduleType === 'cron') {
      const cron = scheduleCron.trim();
      if (!cron) {
        toastWarning('Cron required', 'Enter a cron expression.');
        return null;
      }
      return {
        objective,
        schedule_type: 'cron',
        cron_expression: cron,
        timezone: scheduleTimezone.trim() || 'UTC',
        overlap_policy: scheduleOverlapPolicy,
        ...(scheduleWorkingDirectory.trim() ? { working_directory: scheduleWorkingDirectory.trim() } : {}),
      };
    }

    const intervalValue = Number(scheduleIntervalValue);
    if (!Number.isFinite(intervalValue) || intervalValue <= 0) {
      toastWarning('Interval required', 'Set a positive interval value.');
      return null;
    }

    return {
      objective,
      schedule_type: 'interval',
      interval_value: intervalValue,
      interval_unit: scheduleIntervalUnit,
      timezone: scheduleTimezone.trim() || 'UTC',
      overlap_policy: scheduleOverlapPolicy,
      ...(scheduleWorkingDirectory.trim() ? { working_directory: scheduleWorkingDirectory.trim() } : {}),
    };
  };

  const header = (
    <div className="border-b border-border-light bg-surface-warm/90 px-5 py-4 backdrop-blur">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted">
            <Sparkles size={12} />
            Orchestration surfaces
          </div>
          <div className="mt-2 text-xl font-semibold tracking-tight text-primary">Context, schedules, memory, and reusable launchpads.</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {([
            { id: 'connectors', label: 'Connectors' },
            { id: 'schedules', label: 'Schedules' },
            { id: 'templates', label: 'Templates' },
            { id: 'memory', label: 'Memory' },
            { id: 'teams', label: 'Teams' },
          ] as Array<{ id: Tab; label: string }>).map((item) => (
            <TabPill key={item.id} active={tab === item.id} label={item.label} onClick={() => setTab(item.id)} />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-surface-warm">
      {header}

      {!canUseApi ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="max-w-lg rounded-[28px] border border-border-light bg-surface p-8 text-center shadow-sm">
            <div className="text-lg font-semibold text-primary">Sign in to activate orchestrator surfaces.</div>
            <div className="mt-2 text-sm leading-6 text-secondary">
              Connectors, schedules, memory, templates, and teams all require authenticated API access.
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6">
          {tab === 'connectors' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-secondary">{connectorCards.length} connector providers available</div>
                <Button variant="secondary" onClick={() => void refreshConnectors()}>
                  {connectorsLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                  Refresh
                </Button>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                {connectorCards.map(({ provider, connector }) => {
                  const copy = providerCopy[provider.provider];
                  const Icon = copy.icon;
                  const busy = connectorBusyProvider === provider.provider || connectorBusyId === connector?.id;
                  return (
                    <div key={provider.provider} className={`rounded-[26px] border border-border-light bg-gradient-to-br ${copy.accent} p-[1px] shadow-sm`}>
                      <div className="h-full rounded-[25px] bg-surface/95 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-muted">{copy.eyebrow}</div>
                            <div className="mt-2 flex items-center gap-2 text-xl font-semibold text-primary">
                              <Icon size={18} />
                              {copy.title}
                            </div>
                          </div>
                          <span className="rounded-full border border-border bg-surface px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-muted">
                            {provider.configured ? connector?.status ?? 'ready' : 'server setup needed'}
                          </span>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-secondary">{copy.description}</p>

                        <div className="mt-4 rounded-2xl border border-border-light bg-surface-secondary px-4 py-3">
                          <div className="text-xs uppercase tracking-[0.16em] text-muted">Scopes</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {provider.scopes.length > 0 ? (
                              provider.scopes.map((scope) => (
                                <span key={scope} className="rounded-full border border-border bg-surface px-2 py-1 text-xs text-secondary">
                                  {scope}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted">Provider-defined</span>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 min-h-[58px] text-sm text-secondary">
                          {connector ? (
                            <>
                              <div className="font-medium text-primary">{connector.display_name}</div>
                              <div className="mt-1 text-xs text-muted">{getConnectorSummary(connector) || 'Connected account metadata available.'}</div>
                            </>
                          ) : provider.configured ? (
                            'No account connected yet.'
                          ) : (
                            'Configure OAuth credentials on the server to enable this provider.'
                          )}
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                          <Button
                            onClick={async () => {
                              setConnectorBusyProvider(provider.provider);
                              try {
                                const { authorize_url } = await startConnectorOAuth(config, provider.provider, {
                                  frontend_origin: window.location.origin,
                                });
                                window.open(authorize_url, '_blank', 'noopener,noreferrer,width=620,height=760');
                                toastInfo(`${copy.title} authorization opened`, 'Complete provider auth, then refresh or validate.');
                              } catch (err) {
                                toastApiError(err, `Failed to start ${copy.title} connection`);
                              } finally {
                                setConnectorBusyProvider(null);
                              }
                            }}
                            disabled={!provider.configured || busy}
                          >
                            {busy && connectorBusyProvider === provider.provider ? 'Opening...' : connector ? 'Reconnect' : 'Connect'}
                          </Button>

                          {connector && (
                            <>
                              <Button
                                variant="secondary"
                                onClick={async () => {
                                  setConnectorBusyId(connector.id);
                                  try {
                                    await validateConnector(config, connector.id);
                                    toastSuccess('Connector validated');
                                    await refreshConnectors();
                                  } catch (err) {
                                    toastApiError(err, 'Failed to validate connector');
                                  } finally {
                                    setConnectorBusyId(null);
                                  }
                                }}
                                disabled={busy}
                              >
                                Validate
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={async () => {
                                  setConnectorBusyId(connector.id);
                                  try {
                                    await disconnectConnector(config, connector.id);
                                    toastSuccess('Connector disconnected');
                                    await refreshConnectors();
                                  } catch (err) {
                                    toastApiError(err, 'Failed to disconnect connector');
                                  } finally {
                                    setConnectorBusyId(null);
                                  }
                                }}
                                disabled={busy}
                              >
                                Disconnect
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'templates' && (
            <div className="space-y-4">
              <div className="flex items-end gap-2.5">
                <div className="flex-1">
                  <Input
                    label="Objective"
                    value={templateObjective}
                    onChange={(e) => setTemplateObjective(e.target.value)}
                    placeholder="What should this template do?"
                  />
                </div>
                <Button variant="secondary" onClick={() => void refreshTemplates()}>
                  {templatesLoading ? 'Loading...' : 'Refresh'}
                </Button>
              </div>

              {templates.length === 0 ? (
                <p className="text-sm text-placeholder">No templates yet.</p>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {templates.map((tpl) => (
                    <Card key={tpl.id} padding="lg" className="rounded-[24px] border-border-light bg-surface">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-primary">{tpl.name}</div>
                          <div className="mt-2 text-sm leading-6 text-muted">{tpl.description}</div>
                          <div className="mt-3 text-xs text-placeholder">Uses: {tpl.usage_count} • {tpl.is_public ? 'Public' : 'Private'}</div>
                        </div>
                        <Button
                          onClick={async () => {
                            const objective = templateObjective.trim();
                            if (!objective) {
                              toastWarning('Objective required', 'Enter an objective to use a template.');
                              return;
                            }
                            try {
                              const res = await useTemplate(config, tpl.id, objective);
                              const started = await createWorkflow(config, res.config);
                              toastSuccess('Workflow started', started.workflow_id);
                              onWorkflowStarted?.(started.workflow_id, objective);
                            } catch (err) {
                              toastApiError(err, 'Failed to start workflow');
                            }
                          }}
                        >
                          Use
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'schedules' && (
            <div className="space-y-4">
              <Card padding="lg" className="rounded-[28px] border-border-light bg-surface">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <CalendarClock size={16} />
                  Create schedule
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <TabPill active={scheduleType === 'cron'} label="Cron" onClick={() => setScheduleType('cron')} />
                  <TabPill active={scheduleType === 'interval'} label="Interval" onClick={() => setScheduleType('interval')} />
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {scheduleType === 'cron' ? (
                    <Input value={scheduleCron} onChange={(e) => setScheduleCron(e.target.value)} placeholder="0 * * * *" label="Cron expression" />
                  ) : (
                    <div className="grid grid-cols-[140px_1fr] gap-3">
                      <Input
                        value={scheduleIntervalValue}
                        onChange={(e) => setScheduleIntervalValue(e.target.value)}
                        placeholder="6"
                        label="Interval"
                      />
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-primary">Unit</label>
                        <select
                          value={scheduleIntervalUnit}
                          onChange={(e) => setScheduleIntervalUnit(e.target.value as IntervalUnit)}
                          className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-primary"
                        >
                          {intervalUnits.map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <Input
                    value={scheduleObjective}
                    onChange={(e) => setScheduleObjective(e.target.value)}
                    placeholder="Summarize open GitHub issues and Linear blockers"
                    label="Objective"
                  />
                  <Input
                    value={scheduleTimezone}
                    onChange={(e) => setScheduleTimezone(e.target.value)}
                    placeholder="UTC"
                    label="Timezone"
                  />
                  <Input
                    value={scheduleWorkingDirectory}
                    onChange={(e) => setScheduleWorkingDirectory(e.target.value)}
                    placeholder="/Users/you/projects/app"
                    label="Working directory"
                  />
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-primary">Overlap policy</label>
                    <select
                      value={scheduleOverlapPolicy}
                      onChange={(e) => setScheduleOverlapPolicy(e.target.value as 'skip' | 'queue')}
                      className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-primary"
                    >
                      <option value="skip">Skip if already running</option>
                      <option value="queue">Queue overlapping run</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={async () => {
                      const payload = createSchedulePayload();
                      if (!payload) return;
                      try {
                        await createSchedule(config, payload);
                        toastSuccess('Schedule created');
                        setScheduleObjective('');
                        void refreshSchedules();
                      } catch (err) {
                        toastApiError(err, 'Failed to create schedule');
                      }
                    }}
                  >
                    Create schedule
                  </Button>
                </div>
              </Card>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">{schedules.length} schedules</span>
                <Button variant="secondary" onClick={() => void refreshSchedules()}>
                  {schedulesLoading ? 'Loading...' : 'Refresh'}
                </Button>
              </div>

              {schedules.length === 0 ? (
                <p className="text-sm text-placeholder">No schedules yet.</p>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {schedules.map((schedule) => (
                    <Card key={schedule.id} padding="lg" className="rounded-[24px] border-border-light bg-surface">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                            {schedule.schedule_type === 'interval' ? <Clock3 size={15} /> : <CalendarClock size={15} />}
                            {getScheduleLabel(schedule)}
                          </div>
                          <div className="mt-2 text-sm text-secondary">{schedule.workflow_config ? JSON.parse(schedule.workflow_config).objective ?? 'Scheduled workflow' : 'Scheduled workflow'}</div>
                          <div className="mt-3 text-xs leading-5 text-muted">
                            Next: {formatWhen(schedule.next_run_at)}
                            <br />
                            Timezone: {schedule.timezone} • Overlap: {schedule.overlap_policy}
                            <br />
                            Status: {schedule.status}{schedule.last_run_status ? ` • Last run ${schedule.last_run_status}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            onClick={async () => {
                              try {
                                await updateSchedule(config, schedule.id, { status: schedule.status === 'paused' ? 'active' : 'paused' });
                                toastSuccess('Updated');
                                void refreshSchedules();
                              } catch (err) {
                                toastApiError(err, 'Failed to update schedule');
                              }
                            }}
                          >
                            {schedule.status === 'paused' ? 'Resume' : 'Pause'}
                          </Button>
                          <Button
                            variant="danger"
                            onClick={async () => {
                              try {
                                await deleteSchedule(config, schedule.id);
                                toastSuccess('Deleted');
                                void refreshSchedules();
                              } catch (err) {
                                toastApiError(err, 'Failed to delete schedule');
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      {schedule.last_error && <div className="mt-3 rounded-xl border border-danger/30 bg-danger/15 px-3 py-2 text-xs text-danger">{schedule.last_error}</div>}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'memory' && (
            <div className="space-y-4">
              <Card padding="lg" className="rounded-[28px] border-border-light bg-surface">
                <div className="text-sm font-semibold text-primary">Save memory</div>
                <div className="mt-3 flex gap-2.5">
                  <Input className="flex-1" value={memoryKey} onChange={(e) => setMemoryKey(e.target.value)} placeholder="key" />
                  <Input className="w-40" value={memoryCategory} onChange={(e) => setMemoryCategory(e.target.value)} placeholder="category" />
                </div>
                <Textarea
                  value={memoryContent}
                  onChange={(e) => setMemoryContent(e.target.value)}
                  placeholder="content"
                  maxHeight={200}
                  className="mt-3 rounded-lg border border-border-light bg-surface px-3 py-2"
                />
                <div className="mt-3 flex items-center justify-between">
                  <Button variant="secondary" onClick={() => void refreshMemories()}>
                    {memoriesLoading ? 'Loading...' : 'Refresh'}
                  </Button>
                  <Button
                    onClick={async () => {
                      const key = memoryKey.trim();
                      const content = memoryContent.trim();
                      if (!key || !content) {
                        toastWarning('Missing fields', 'key and content are required.');
                        return;
                      }
                      try {
                        await saveMemory(config, { key, content, category: memoryCategory.trim() || undefined });
                        toastSuccess('Saved');
                        setMemoryKey('');
                        setMemoryContent('');
                        void refreshMemories();
                      } catch (err) {
                        toastApiError(err, 'Failed to save memory');
                      }
                    }}
                  >
                    Save
                  </Button>
                </div>
              </Card>

              {memories.length === 0 ? (
                <p className="text-sm text-placeholder">No memories saved yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {memories.map((memory) => (
                    <Card key={memory.id} padding="md" className="rounded-[22px] border-border-light bg-surface">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-primary">{memory.key}</div>
                          <div className="mt-1 text-xs text-placeholder">{memory.category}</div>
                        </div>
                        <Button
                          variant="danger"
                          onClick={async () => {
                            try {
                              await deleteMemory(config, memory.id);
                              toastSuccess('Deleted');
                              void refreshMemories();
                            } catch (err) {
                              toastApiError(err, 'Failed to delete memory');
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                      <div className="mt-2.5 whitespace-pre-wrap text-sm text-muted">{memory.content}</div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'teams' && (
            <div className="space-y-4">
              {teamsStatus === 'disabled' ? (
                <Card padding="lg" className="rounded-[24px] border-border-light bg-surface">
                  <span className="text-sm text-muted">
                    Teams is disabled on this server. Enable it with <code className="rounded bg-surface-tertiary px-1.5 py-0.5 text-xs">TEAMS_BETA_ENABLED=1</code>.
                  </span>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">{teams.length} teams</span>
                    <Button variant="secondary" onClick={() => void refreshTeams()}>
                      {teamsStatus === 'loading' ? 'Loading...' : 'Refresh'}
                    </Button>
                  </div>

                  {teams.length === 0 ? (
                    <p className="text-sm text-placeholder">No teams yet.</p>
                  ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                      {teams.map((team) => (
                        <Card key={String(team.id ?? Math.random())} padding="lg" className="rounded-[22px] border-border-light bg-surface">
                          <span className="text-sm text-primary">{String(team.name ?? team.id)}</span>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}

              <Card padding="lg" className="rounded-[24px] border-border-light bg-surface">
                <div className="text-sm font-semibold text-primary">Shared team context</div>
                <div className="mt-2 text-sm leading-6 text-secondary">
                  Teams data is live from the API. Use this surface to verify membership and shared context availability before rolling out team workflows.
                </div>
                <div className="mt-4 text-xs text-muted">
                  The server already owns full team context APIs; this screen now exposes the current team inventory instead of a placeholder action.
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
