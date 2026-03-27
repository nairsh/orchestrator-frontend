import { useEffect, useMemo, useState } from 'react';
import type { ApiConfig } from '../../api/client';
import {
  listConnectorProviders,
  listConnectors,
  listMemories,
  listSchedules,
  listTeams,
  listTemplates,
} from '../../api/client';
import type {
  ConnectorProvider,
  ConnectorProviderInfo,
  ConnectorRecord,
  Memory,
  ScheduledWorkflow,
  WorkflowTemplate,
} from '../../api/types';
import { toastApiError } from '../../lib/toast';
import { SegmentedControl } from '../ui/SegmentedControl';
import type { Tab } from './connectorsHelpers';
import { ConnectorsTab } from './ConnectorsTab';
import { SchedulesTab } from './SchedulesTab';
import { TemplatesTab } from './TemplatesTab';
import { MemoryTab } from './MemoryTab';
import { TeamsTab } from './TeamsTab';

interface ConnectorsPageProps {
  config: ApiConfig;
  onWorkflowStarted?: (workflowId: string, objective: string) => void;
}

export function ConnectorsPage({ config, onWorkflowStarted }: ConnectorsPageProps) {
  const [tab, setTab] = useState<Tab>('connectors');

  /* ─── Connectors state ─── */
  const [providers, setProviders] = useState<ConnectorProviderInfo[]>([]);
  const [connectors, setConnectors] = useState<ConnectorRecord[]>([]);
  const [connectorsLoading, setConnectorsLoading] = useState(false);
  const [connectorBusyId, setConnectorBusyId] = useState<string | null>(null);
  const [connectorBusyProvider, setConnectorBusyProvider] = useState<ConnectorProvider | null>(null);

  /* ─── Templates state ─── */
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  /* ─── Schedules state ─── */
  const [schedules, setSchedules] = useState<ScheduledWorkflow[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  /* ─── Memory state ─── */
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(false);

  /* ─── Teams state ─── */
  const [teamsStatus, setTeamsStatus] = useState<'idle' | 'loading' | 'disabled' | 'ready'>('idle');
  const [teams, setTeams] = useState<Array<Record<string, unknown>>>([]);

  const canUseApi = useMemo(() => Boolean(config.hasAuth), [config.hasAuth]);

  /* ─── Data fetchers ─── */

  const refreshConnectors = async () => {
    if (!canUseApi) return;
    setConnectorsLoading(true);
    try {
      const [providerRes, connectorRes] = await Promise.all([listConnectorProviders(config), listConnectors(config)]);
      setProviders(providerRes.providers ?? []);
      setConnectors(connectorRes.connectors ?? []);
    } catch (err) { toastApiError(err, 'Failed to load connectors'); }
    finally { setConnectorsLoading(false); }
  };

  const refreshTemplates = async () => {
    if (!canUseApi) return;
    setTemplatesLoading(true);
    try { const res = await listTemplates(config); setTemplates(res.templates ?? []); }
    catch (err) { toastApiError(err, 'Failed to load templates'); }
    finally { setTemplatesLoading(false); }
  };

  const refreshSchedules = async () => {
    if (!canUseApi) return;
    setSchedulesLoading(true);
    try { const res = await listSchedules(config); setSchedules(res.schedules ?? []); }
    catch (err) { toastApiError(err, 'Failed to load schedules'); }
    finally { setSchedulesLoading(false); }
  };

  const refreshMemories = async () => {
    if (!canUseApi) return;
    setMemoriesLoading(true);
    try { const res = await listMemories(config); setMemories(res.memories ?? []); }
    catch (err) { toastApiError(err, 'Failed to load memory'); }
    finally { setMemoriesLoading(false); }
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
        setTeamsStatus('disabled'); return;
      }
      setTeamsStatus('idle');
      toastApiError(err, 'Failed to load teams');
    }
  };

  /* ─── Tab-change data loading ─── */

  useEffect(() => {
    if (!canUseApi) return;
    if (tab === 'connectors') void refreshConnectors();
    if (tab === 'templates') void refreshTemplates();
    if (tab === 'schedules') void refreshSchedules();
    if (tab === 'memory') void refreshMemories();
    if (tab === 'teams') void refreshTeams();
  }, [tab, canUseApi, config.baseUrl, config.hasAuth]);

  /* ─── Derived state ─── */

  const connectorCards = useMemo(
    () => providers.map((provider) => ({
      provider,
      connector: connectors.find((c) => c.provider === provider.provider && c.status !== 'disconnected') ?? null,
    })),
    [providers, connectors],
  );

  /* ─── Tab-contextual headings ─── */
  const TAB_HEADINGS: Record<Tab, { title: string; description: string }> = {
    connectors: { title: 'Connectors', description: 'Connect your apps and services so your AI can access and act on your data.' },
    schedules: { title: 'Schedules', description: 'Automate recurring tasks on a fixed schedule or repeating interval.' },
    templates: { title: 'Templates', description: 'Save and reuse task configurations as starting points.' },
    memory: { title: 'Memory', description: 'Save context your AI can recall across tasks — preferences, facts, or instructions.' },
    teams: { title: 'Teams', description: 'Collaborate with team members and share context across your organization.' },
  };

  const heading = TAB_HEADINGS[tab];

  /* ─── Render ─── */

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-surface-warm font-sans">
      {/* Header + tabs */}
      <div className="bg-surface-warm px-8 pt-8 pb-2">
        <h1 className="text-xl font-semibold text-primary">{heading.title}</h1>
        <p className="mt-2 text-sm text-secondary leading-relaxed">
          {heading.description}
        </p>
        <div className="flex items-center justify-between mt-5">
          <SegmentedControl
            value={tab}
            options={[
              { label: 'Connectors', value: 'connectors' as Tab },
              { label: 'Schedules', value: 'schedules' as Tab },
              { label: 'Templates', value: 'templates' as Tab },
              { label: 'Memory', value: 'memory' as Tab },
              { label: 'Teams', value: 'teams' as Tab },
            ]}
            onChange={(val) => setTab(val as Tab)}
          />
        </div>
      </div>

      {!canUseApi ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="max-w-lg rounded-[28px] border border-border-light bg-surface p-8 text-center shadow-sm">
            <div className="text-lg font-semibold text-primary">Sign in to continue.</div>
            <div className="mt-2 text-sm leading-6 text-secondary">
              Connectors, schedules, memory, templates, and teams all require you to be signed in.
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {tab === 'connectors' && (
            <ConnectorsTab
              connectorCards={connectorCards} connectorsLoading={connectorsLoading}
              connectorBusyId={connectorBusyId} connectorBusyProvider={connectorBusyProvider}
              setConnectorBusyId={setConnectorBusyId} setConnectorBusyProvider={setConnectorBusyProvider}
              onRefresh={refreshConnectors} config={config}
            />
          )}
          {tab === 'templates' && (
            <TemplatesTab templates={templates} templatesLoading={templatesLoading} config={config} onRefresh={refreshTemplates} onWorkflowStarted={onWorkflowStarted} />
          )}
          {tab === 'schedules' && (
            <SchedulesTab schedules={schedules} schedulesLoading={schedulesLoading} config={config} onRefresh={refreshSchedules} />
          )}
          {tab === 'memory' && (
            <MemoryTab memories={memories} memoriesLoading={memoriesLoading} config={config} onRefresh={refreshMemories} />
          )}
          {tab === 'teams' && (
            <TeamsTab teams={teams} teamsStatus={teamsStatus} onRefresh={refreshTeams} />
          )}
        </div>
      )}
    </div>
  );
}
