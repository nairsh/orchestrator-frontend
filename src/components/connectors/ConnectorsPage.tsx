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

type Tab = 'templates' | 'schedules' | 'memory' | 'teams';

interface ConnectorsPageProps {
  config: ApiConfig;
  onWorkflowStarted?: (workflowId: string, objective: string) => void;
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

  const canUseApi = useMemo(() => !!config.apiKey, [config.apiKey]);

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
  }, [tab, canUseApi, config.baseUrl, config.apiKey]);

  const header = (
    <div className="flex items-center justify-between" style={{ padding: '16px 20px', borderBottom: '1px solid #EBEBEB', background: '#FAF8F4' }}>
      <div className="flex items-center" style={{ gap: 10 }}>
        <span style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 500, color: '#111111' }}>Connectors</span>
        <div className="flex items-center" style={{ gap: 6 }}>
          {([
            { id: 'templates', label: 'Templates' },
            { id: 'schedules', label: 'Schedules' },
            { id: 'memory', label: 'Memory' },
            { id: 'teams', label: 'Teams' },
          ] as Array<{ id: Tab; label: string }>).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                borderRadius: 999,
                padding: '6px 10px',
                border: '1px solid #E0E0E0',
                background: tab === t.id ? '#111111' : '#FFFFFF',
                color: tab === t.id ? '#FFFFFF' : '#111111',
                fontFamily: 'Inter',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#666666' }}>{canUseApi ? 'Connected' : 'Not connected'}</div>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden" style={{ background: '#FAF8F4' }}>
      {header}

      {!canUseApi ? (
        <div className="flex-1 flex items-center justify-center" style={{ fontFamily: 'Inter', fontSize: 14, color: '#888888' }}>
          Add an API key in settings to use connectors.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto" style={{ padding: 20, background: '#faf8f4' }}>
          {tab === 'templates' && (
            <div className="flex flex-col" style={{ gap: 14 }}>
              <div className="flex items-end" style={{ gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label className="block text-xs font-medium text-primary mb-1.5">Objective</label>
                  <input
                    type="text"
                    value={templateObjective}
                    onChange={(e) => setTemplateObjective(e.target.value)}
                    placeholder="What should this template do?"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-primary outline-none focus:border-gray-400 transition-colors duration-150 bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void refreshTemplates()}
                  style={{
                    borderRadius: 10,
                    padding: '8px 12px',
                    border: '1px solid #E0E0E0',
                    background: '#FFFFFF',
                    fontFamily: 'Inter',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#111111',
                  }}
                >
                  {templatesLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {templates.length === 0 ? (
                <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#888888' }}>No templates yet.</div>
              ) : (
                <div className="flex flex-col" style={{ gap: 10 }}>
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      style={{
                        borderRadius: 14,
                        border: '1px solid #E6E6E6',
                        background: '#FFFFFF',
                        padding: 14,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      }}
                    >
                      <div className="flex items-start justify-between" style={{ gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: '#111111' }}>{tpl.name}</div>
                          <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#666666', marginTop: 4 }}>{tpl.description}</div>
                          <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#888888', marginTop: 8 }}>
                            Uses: {tpl.usage_count} • {tpl.is_public ? 'Public' : 'Private'}
                          </div>
                        </div>
                        <button
                          type="button"
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
                          style={{
                            borderRadius: 10,
                            padding: '8px 12px',
                            border: 'none',
                            background: '#111111',
                            fontFamily: 'Inter',
                            fontSize: 13,
                            fontWeight: 500,
                            color: '#FFFFFF',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Use
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'schedules' && (
            <div className="flex flex-col" style={{ gap: 14 }}>
              <div
                style={{
                  borderRadius: 14,
                  border: '1px solid #E6E6E6',
                  background: '#FFFFFF',
                  padding: 14,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: '#111111', marginBottom: 10 }}>Create schedule</div>
                <div className="flex" style={{ gap: 10 }}>
                  <input
                    type="text"
                    value={scheduleCron}
                    onChange={(e) => setScheduleCron(e.target.value)}
                    placeholder="cron_expression"
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-primary outline-none focus:border-gray-400 transition-colors duration-150 bg-white"
                  />
                  <input
                    type="text"
                    value={scheduleObjective}
                    onChange={(e) => setScheduleObjective(e.target.value)}
                    placeholder="objective"
                    className="flex-[2] px-3 py-2 rounded-lg border border-gray-200 text-sm text-primary outline-none focus:border-gray-400 transition-colors duration-150 bg-white"
                  />
                  <button
                    type="button"
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
                    style={{
                      borderRadius: 10,
                      padding: '8px 12px',
                      border: 'none',
                      background: '#111111',
                      fontFamily: 'Inter',
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#FFFFFF',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Create
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#666666' }}>{schedules.length} schedules</div>
                <button
                  type="button"
                  onClick={() => void refreshSchedules()}
                  style={{
                    borderRadius: 10,
                    padding: '8px 12px',
                    border: '1px solid #E0E0E0',
                    background: '#FFFFFF',
                    fontFamily: 'Inter',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#111111',
                  }}
                >
                  {schedulesLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {schedules.length === 0 ? (
                <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#888888' }}>No schedules yet.</div>
              ) : (
                <div className="flex flex-col" style={{ gap: 10 }}>
                  {schedules.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        borderRadius: 14,
                        border: '1px solid #E6E6E6',
                        background: '#FFFFFF',
                        padding: 14,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      }}
                    >
                      <div className="flex items-start justify-between" style={{ gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: '#111111' }}>{s.cron_expression}</div>
                          <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#666666', marginTop: 6 }}>
                            Next: {s.next_run_at ?? '—'} • Status: {s.status}
                          </div>
                        </div>
                        <div className="flex items-center" style={{ gap: 8 }}>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await updateSchedule(config, s.id, { status: s.status === 'paused' ? 'active' : 'paused' });
                                toastSuccess('Updated');
                                void refreshSchedules();
                              } catch (err) {
                                toastApiError(err, 'Failed to update schedule');
                              }
                            }}
                            style={{
                              borderRadius: 10,
                              padding: '8px 12px',
                              border: '1px solid #E0E0E0',
                              background: '#FFFFFF',
                              fontFamily: 'Inter',
                              fontSize: 13,
                              fontWeight: 500,
                              color: '#111111',
                            }}
                          >
                            {s.status === 'paused' ? 'Resume' : 'Pause'}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await deleteSchedule(config, s.id);
                                toastSuccess('Deleted');
                                void refreshSchedules();
                              } catch (err) {
                                toastApiError(err, 'Failed to delete schedule');
                              }
                            }}
                            style={{
                              borderRadius: 10,
                              padding: '8px 12px',
                              border: 'none',
                              background: '#EF4444',
                              fontFamily: 'Inter',
                              fontSize: 13,
                              fontWeight: 500,
                              color: '#FFFFFF',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'memory' && (
            <div className="flex flex-col" style={{ gap: 14 }}>
              <div
                style={{
                  borderRadius: 14,
                  border: '1px solid #E6E6E6',
                  background: '#FFFFFF',
                  padding: 14,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: '#111111', marginBottom: 10 }}>Save memory</div>
                <div className="flex" style={{ gap: 10, marginBottom: 10 }}>
                  <input
                    type="text"
                    value={memoryKey}
                    onChange={(e) => setMemoryKey(e.target.value)}
                    placeholder="key"
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-primary outline-none focus:border-gray-400 transition-colors duration-150 bg-white"
                  />
                  <input
                    type="text"
                    value={memoryCategory}
                    onChange={(e) => setMemoryCategory(e.target.value)}
                    placeholder="category"
                    className="w-40 px-3 py-2 rounded-lg border border-gray-200 text-sm text-primary outline-none focus:border-gray-400 transition-colors duration-150 bg-white"
                  />
                </div>
                <textarea
                  value={memoryContent}
                  onChange={(e) => setMemoryContent(e.target.value)}
                  placeholder="content"
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-primary outline-none focus:border-gray-400 transition-colors duration-150 bg-white"
                  style={{ fontFamily: 'Inter' }}
                />
                <div className="flex items-center justify-between" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => void refreshMemories()}
                    style={{
                      borderRadius: 10,
                      padding: '8px 12px',
                      border: '1px solid #E0E0E0',
                      background: '#FFFFFF',
                      fontFamily: 'Inter',
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#111111',
                    }}
                  >
                    {memoriesLoading ? 'Loading...' : 'Refresh'}
                  </button>
                  <button
                    type="button"
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
                    style={{
                      borderRadius: 10,
                      padding: '8px 12px',
                      border: 'none',
                      background: '#111111',
                      fontFamily: 'Inter',
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#FFFFFF',
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>

              {memories.length === 0 ? (
                <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#888888' }}>No memories saved yet.</div>
              ) : (
                <div className="flex flex-col" style={{ gap: 10 }}>
                  {memories.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        borderRadius: 14,
                        border: '1px solid #E6E6E6',
                        background: '#FFFFFF',
                        padding: 14,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      }}
                    >
                      <div className="flex items-start justify-between" style={{ gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: '#111111' }}>{m.key}</div>
                          <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#888888', marginTop: 4 }}>{m.category}</div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await deleteMemory(config, m.id);
                              toastSuccess('Deleted');
                              void refreshMemories();
                            } catch (err) {
                              toastApiError(err, 'Failed to delete memory');
                            }
                          }}
                          style={{
                            borderRadius: 10,
                            padding: '8px 12px',
                            border: 'none',
                            background: '#EF4444',
                            fontFamily: 'Inter',
                            fontSize: 13,
                            fontWeight: 500,
                            color: '#FFFFFF',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                      <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#666666', marginTop: 10, whiteSpace: 'pre-wrap' }}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'teams' && (
            <div className="flex flex-col" style={{ gap: 14 }}>
              {teamsStatus === 'disabled' ? (
                <div
                  style={{
                    borderRadius: 14,
                    border: '1px solid #E6E6E6',
                    background: '#FFFFFF',
                    padding: 14,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    fontFamily: 'Inter',
                    fontSize: 13,
                    color: '#666666',
                  }}
                >
                  Teams is disabled on this server. Enable it with <code>TEAMS_BETA_ENABLED=1</code>.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#666666' }}>{teams.length} teams</div>
                    <button
                      type="button"
                      onClick={() => void refreshTeams()}
                      style={{
                        borderRadius: 10,
                        padding: '8px 12px',
                        border: '1px solid #E0E0E0',
                        background: '#FFFFFF',
                        fontFamily: 'Inter',
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#111111',
                      }}
                    >
                      {teamsStatus === 'loading' ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>

                  {teams.length === 0 ? (
                    <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#888888' }}>No teams yet.</div>
                  ) : (
                    <div className="flex flex-col" style={{ gap: 10 }}>
                      {teams.map((t) => (
                        <div
                          key={String(t.id ?? Math.random())}
                          style={{
                            borderRadius: 14,
                            border: '1px solid #E6E6E6',
                            background: '#FFFFFF',
                            padding: 14,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            fontFamily: 'Inter',
                            fontSize: 13,
                            color: '#111111',
                          }}
                        >
                          {String(t.name ?? t.id)}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={() => toastInfo('Teams', 'Full team management UI is coming soon.')}
                style={{
                  borderRadius: 10,
                  padding: '10px 12px',
                  border: '1px solid #E0E0E0',
                  background: '#FFFFFF',
                  fontFamily: 'Inter',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#111111',
                }}
              >
                Manage team members and contexts
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
