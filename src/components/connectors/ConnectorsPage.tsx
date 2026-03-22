import { useEffect, useMemo, useState } from 'react';
import type { ApiConfig } from '../../api/client';
import {
  createSchedule,
  deleteMemory,
  deleteSchedule,
  listMemories,
  listSchedules,
  listTeams,
  listTemplates,
  saveMemory,
  updateSchedule,
  useTemplate,
  createWorkflow,
} from '../../api/client';
import type { Memory, ScheduledWorkflow, WorkflowTemplate } from '../../api/types';
import { toastApiError, toastInfo, toastSuccess, toastWarning } from '../../lib/toast';
import { Button, Card, Input, Textarea } from '../ui';

type Tab = 'templates' | 'schedules' | 'memory' | 'teams';

interface ConnectorsPageProps {
  config: ApiConfig;
  onWorkflowStarted?: (workflowId: string, objective: string) => void;
}

/* ─── Pill tab button ─── */
function TabPill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-pill px-2.5 py-1.5 border text-xs font-medium font-sans transition-colors duration-150 cursor-pointer',
        active
          ? 'bg-ink text-primary border-ink'
          : 'bg-surface text-primary border-border hover:bg-surface-hover',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

export function ConnectorsPage({ config, onWorkflowStarted }: ConnectorsPageProps) {
  const [tab, setTab] = useState<Tab>('templates');

  // Templates
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateObjective, setTemplateObjective] = useState('');

  // Schedules
  const [schedules, setSchedules] = useState<ScheduledWorkflow[]>([]);
  const [scheduleCron, setScheduleCron] = useState('0 * * * *');
  const [scheduleObjective, setScheduleObjective] = useState('');
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  // Memory
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoryKey, setMemoryKey] = useState('');
  const [memoryCategory, setMemoryCategory] = useState('general');
  const [memoryContent, setMemoryContent] = useState('');
  const [memoriesLoading, setMemoriesLoading] = useState(false);

  // Teams
  const [teamsStatus, setTeamsStatus] = useState<'idle' | 'loading' | 'disabled' | 'ready'>('idle');
  const [teams, setTeams] = useState<Array<Record<string, unknown>>>([]);

  const canUseApi = useMemo(() => Boolean(config.hasAuth), [config.hasAuth]);

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
      // Teams can be feature-flagged; 404 is expected when disabled.
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
    if (tab === 'templates') void refreshTemplates();
    if (tab === 'schedules') void refreshSchedules();
    if (tab === 'memory') void refreshMemories();
    if (tab === 'teams') void refreshTeams();
  }, [tab, canUseApi, config.baseUrl, config.hasAuth]);

  /* ─── Header ─── */
  const header = (
    <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-warm">
      <div className="flex items-center gap-2.5">
        <span className="font-sans text-base font-medium text-primary">Connectors</span>
        <div className="flex items-center gap-1.5">
          {([
            { id: 'templates', label: 'Templates' },
            { id: 'schedules', label: 'Schedules' },
            { id: 'memory', label: 'Memory' },
            { id: 'teams', label: 'Teams' },
          ] as Array<{ id: Tab; label: string }>).map((t) => (
            <TabPill key={t.id} active={tab === t.id} label={t.label} onClick={() => setTab(t.id)} />
          ))}
        </div>
      </div>
      <div className="font-sans text-xs text-muted">{canUseApi ? 'Connected' : 'Not connected'}</div>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-surface-warm">
      {header}

      {!canUseApi ? (
        <div className="flex-1 flex items-center justify-center font-sans text-sm text-placeholder">
          Sign in to use connectors.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5">
          {/* ─── Templates tab ─── */}
          {tab === 'templates' && (
            <div className="flex flex-col gap-3.5">
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
                <div className="flex flex-col gap-2.5">
                  {templates.map((tpl) => (
                    <Card key={tpl.id} padding="md">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-primary">{tpl.name}</div>
                          <div className="text-sm text-muted mt-1">{tpl.description}</div>
                          <div className="text-xs text-placeholder mt-2">
                            Uses: {tpl.usage_count} &bull; {tpl.is_public ? 'Public' : 'Private'}
                          </div>
                        </div>
                        <Button
                          onClick={async () => {
                            const obj = templateObjective.trim();
                            if (!obj) {
                              toastWarning('Objective required', 'Enter an objective to use a template.');
                              return;
                            }
                            try {
                              const res = await useTemplate(config, tpl.id, obj);
                              const started = await createWorkflow(config, res.config);
                              toastSuccess('Workflow started', started.workflow_id);
                              onWorkflowStarted?.(started.workflow_id, obj);
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

          {/* ─── Schedules tab ─── */}
          {tab === 'schedules' && (
            <div className="flex flex-col gap-3.5">
              <Card padding="md">
                <div className="text-sm font-semibold text-primary mb-2.5">Create schedule</div>
                <div className="flex gap-2.5">
                  <Input
                    className="flex-1"
                    value={scheduleCron}
                    onChange={(e) => setScheduleCron(e.target.value)}
                    placeholder="cron_expression"
                  />
                  <Input
                    className="flex-[2]"
                    value={scheduleObjective}
                    onChange={(e) => setScheduleObjective(e.target.value)}
                    placeholder="objective"
                  />
                  <Button
                    onClick={async () => {
                      const cron = scheduleCron.trim();
                      const obj = scheduleObjective.trim();
                      if (!cron || !obj) {
                        toastWarning('Missing fields', 'cron_expression and objective are required.');
                        return;
                      }
                      try {
                        await createSchedule(config, { cron_expression: cron, objective: obj });
                        toastSuccess('Schedule created');
                        setScheduleObjective('');
                        void refreshSchedules();
                      } catch (err) {
                        toastApiError(err, 'Failed to create schedule');
                      }
                    }}
                  >
                    Create
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
                <div className="flex flex-col gap-2.5">
                  {schedules.map((s) => (
                    <Card key={s.id} padding="md">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-primary">{s.cron_expression}</div>
                          <div className="text-xs text-muted mt-1.5">
                            Next: {s.next_run_at ?? '—'} &bull; Status: {s.status}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            onClick={async () => {
                              try {
                                await updateSchedule(config, s.id, { status: s.status === 'paused' ? 'active' : 'paused' });
                                toastSuccess('Updated');
                                void refreshSchedules();
                              } catch (err) {
                                toastApiError(err, 'Failed to update schedule');
                              }
                            }}
                          >
                            {s.status === 'paused' ? 'Resume' : 'Pause'}
                          </Button>
                          <Button
                            variant="danger"
                            onClick={async () => {
                              try {
                                await deleteSchedule(config, s.id);
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
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Memory tab ─── */}
          {tab === 'memory' && (
            <div className="flex flex-col gap-3.5">
              <Card padding="md">
                <div className="text-sm font-semibold text-primary mb-2.5">Save memory</div>
                <div className="flex gap-2.5 mb-2.5">
                  <Input
                    className="flex-1"
                    value={memoryKey}
                    onChange={(e) => setMemoryKey(e.target.value)}
                    placeholder="key"
                  />
                  <Input
                    className="w-40"
                    value={memoryCategory}
                    onChange={(e) => setMemoryCategory(e.target.value)}
                    placeholder="category"
                  />
                </div>
                <Textarea
                  value={memoryContent}
                  onChange={(e) => setMemoryContent(e.target.value)}
                  placeholder="content"
                  maxHeight={200}
                  className="px-3 py-2 rounded-lg border border-border-light bg-surface"
                />
                <div className="flex items-center justify-between mt-2.5">
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
                <div className="flex flex-col gap-2.5">
                  {memories.map((m) => (
                    <Card key={m.id} padding="md">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-primary">{m.key}</div>
                          <div className="text-xs text-placeholder mt-1">{m.category}</div>
                        </div>
                        <Button
                          variant="danger"
                          onClick={async () => {
                            try {
                              await deleteMemory(config, m.id);
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
                      <div className="text-sm text-muted mt-2.5 whitespace-pre-wrap">{m.content}</div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Teams tab ─── */}
          {tab === 'teams' && (
            <div className="flex flex-col gap-3.5">
              {teamsStatus === 'disabled' ? (
                <Card padding="md">
                  <span className="text-sm text-muted">
                    Teams is disabled on this server. Enable it with <code className="text-xs bg-surface-tertiary px-1.5 py-0.5 rounded">TEAMS_BETA_ENABLED=1</code>.
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
                    <div className="flex flex-col gap-2.5">
                      {teams.map((t) => (
                        <Card key={String(t.id ?? Math.random())} padding="md">
                          <span className="text-sm text-primary">{String(t.name ?? t.id)}</span>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}

              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={() => toastInfo('Teams', 'Full team management UI is coming soon.')}
              >
                Manage team members and contexts
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
