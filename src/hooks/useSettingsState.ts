import { humanizeModelName, humanizeProviderName } from '../lib/modelNames';
import { useEffect, useMemo, useState } from 'react';
import {
  disconnectConnector,
  getModelPreferences,
  getModels,
  invalidateModelsCache,
  listConnectorProviders,
  listConnectors,
  resetModelPreferences,
  saveModelPreferences,
  startConnectorOAuth,
  validateConnector,
} from '../api/client';
import type {
  AgentType,
  ConnectorProvider,
  ConnectorProviderInfo,
  ConnectorRecord,
  ModelInfo,
  ModelPreferences,
} from '../api/types';
import type { ModelIconOverrides } from '../lib/modelIcons';
import { toastApiError, toastConnector, toastInfo, toastSettingsSaved } from '../lib/toast';

const INFERRED_ICON_VALUE = '__inferred__';

const FORMAT_PROVIDER_NAME: Record<ConnectorProvider, string> = {
  github: 'GitHub',
  linear: 'Linear',
  notion: 'Notion',
};

interface UseSettingsStateOptions {
  baseUrl: string;
  isSignedIn: boolean;
  getAuthToken?: () => Promise<string | null>;
  initialModelIconOverrides?: ModelIconOverrides;
}

export function useSettingsState({
  baseUrl,
  isSignedIn,
  getAuthToken,
  initialModelIconOverrides = {},
}: UseSettingsStateOptions) {
  const [modelsStatus, setModelsStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [iconOverrides, setIconOverrides] = useState<ModelIconOverrides>(initialModelIconOverrides);

  const [preferencesStatus, setPreferencesStatus] = useState<'idle' | 'loading' | 'saving' | 'error'>('idle');
  const [modelPreferences, setModelPreferences] = useState<ModelPreferences | null>(null);
  const [routingDirty, setRoutingDirty] = useState(false);

  const [providers, setProviders] = useState<ConnectorProviderInfo[]>([]);
  const [connectors, setConnectors] = useState<ConnectorRecord[]>([]);
  const [connectorsLoading, setConnectorsLoading] = useState(false);
  const [connectorBusyProvider, setConnectorBusyProvider] = useState<ConnectorProvider | null>(null);
  const [connectorBusyId, setConnectorBusyId] = useState<string | null>(null);

  const trimmedBase = baseUrl.trim();
  const apiConfig = useMemo(
    () => ({ baseUrl: trimmedBase, getAuthToken, hasAuth: isSignedIn }),
    [trimmedBase, getAuthToken, isSignedIn],
  );

  const sortedModels = useMemo(() => [...models].sort((a, b) => a.display_name.localeCompare(b.display_name)), [models]);
  const modelOptions = useMemo(() => sortedModels.map((m) => ({ value: m.id, label: `${humanizeModelName(m.display_name)} (${humanizeProviderName(m.provider)})` })), [sortedModels]);
  const availableModelIds = useMemo(() => new Set(models.map((m) => m.id)), [models]);

  const providerCards = useMemo(
    () => providers.map((p) => ({ provider: p, connector: connectors.find((c) => c.provider === p.provider && c.status !== 'disconnected') ?? null })),
    [providers, connectors],
  );

  useEffect(() => { setIconOverrides(initialModelIconOverrides); }, [initialModelIconOverrides]);

  useEffect(() => {
    if (!trimmedBase) { setModels([]); setModelPreferences(null); setProviders([]); setConnectors([]); setModelsStatus('idle'); setPreferencesStatus('idle'); return; }
    let cancelled = false;
    setModelsStatus('loading');
    getModels({ baseUrl: trimmedBase, getAuthToken })
      .then((res) => { if (!cancelled) { setModels(res.models ?? []); setModelsStatus('idle'); } })
      .catch(() => { if (!cancelled) { setModels([]); setModelsStatus('error'); } });
    return () => { cancelled = true; };
  }, [trimmedBase, getAuthToken]);

  const refreshModelPreferences = async () => {
    if (!trimmedBase || !isSignedIn) { setModelPreferences(null); return; }
    setPreferencesStatus('loading');
    try { const p = await getModelPreferences(apiConfig); setModelPreferences(p); setRoutingDirty(false); setPreferencesStatus('idle'); }
    catch (err) { setPreferencesStatus('error'); setModelPreferences(null); toastApiError(err, 'Couldn\'t load your AI preferences'); }
  };

  const refreshConnectors = async () => {
    if (!trimmedBase || !isSignedIn) { setProviders([]); setConnectors([]); return; }
    setConnectorsLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([listConnectorProviders(apiConfig), listConnectors(apiConfig)]);
      setProviders(pRes.providers ?? []); setConnectors(cRes.connectors ?? []);
    } catch (err) { toastApiError(err, 'Couldn\'t load your connected services'); }
    finally { setConnectorsLoading(false); }
  };

  useEffect(() => {
    if (!isSignedIn) { setModelPreferences(null); setProviders([]); setConnectors([]); return; }
    void refreshModelPreferences(); void refreshConnectors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmedBase, isSignedIn]);

  /* ─── Routing Handlers ─── */

  const handleRoutingChange = (agent: AgentType, value: string) => {
    setModelPreferences((cur) => {
      if (!cur) return cur;
      const next = { ...cur, agent_models: { ...cur.agent_models } };
      if (!value) delete next.agent_models[agent]; else next.agent_models[agent] = value;
      return next;
    });
    setRoutingDirty(true);
  };

  const handleDefaultModelChange = (value: string) => {
    setModelPreferences((cur) => cur ? { ...cur, default_orchestrator_model: value } : cur);
    setRoutingDirty(true);
  };

  const handleSaveRouting = async () => {
    if (!modelPreferences) return;
    setPreferencesStatus('saving');
    try {
      const saved = await saveModelPreferences(apiConfig, {
        default_orchestrator_model: modelPreferences.default_orchestrator_model,
        orchestrator_models: modelPreferences.orchestrator_models,
        agent_models: modelPreferences.agent_models,
        subagent_models: modelPreferences.subagent_models,
      });
      setModelPreferences(saved); setRoutingDirty(false); setPreferencesStatus('idle');
      invalidateModelsCache(apiConfig);
      toastSettingsSaved('AI preferences');
    } catch (err) { setPreferencesStatus('error'); toastApiError(err, 'Couldn\'t save your AI preferences'); }
  };

  const handleResetRouting = async () => {
    setPreferencesStatus('saving');
    try { const reset = await resetModelPreferences(apiConfig); setModelPreferences(reset); setRoutingDirty(false); setPreferencesStatus('idle'); invalidateModelsCache(apiConfig); toastInfo('AI preferences reset to defaults'); }
    catch (err) { setPreferencesStatus('error'); toastApiError(err, 'Couldn\'t reset your AI preferences'); }
  };

  /* ─── Connector Handlers ─── */

  const handleConnectProvider = async (provider: ConnectorProvider) => {
    setConnectorBusyProvider(provider);
    try {
      const { authorize_url } = await startConnectorOAuth(apiConfig, provider, { frontend_origin: window.location.origin });
      window.open(authorize_url, '_blank', 'noopener,noreferrer,width=620,height=760');
      toastInfo(`${FORMAT_PROVIDER_NAME[provider]} authorization opened`);
    } catch (err) { toastApiError(err, `Couldn't connect to ${FORMAT_PROVIDER_NAME[provider]}`); }
    finally { setConnectorBusyProvider(null); }
  };

  const handleValidateConnector = async (connectorId: string) => {
    setConnectorBusyId(connectorId);
    const name = connectors.find((c) => c.id === connectorId)?.provider ?? 'Service';
    try { await validateConnector(apiConfig, connectorId); toastConnector('verified', FORMAT_PROVIDER_NAME[name as ConnectorProvider] ?? name); await refreshConnectors(); }
    catch (err) { toastApiError(err, 'Couldn\'t refresh this connection'); }
    finally { setConnectorBusyId(null); }
  };

  const handleDisconnectConnector = async (connectorId: string) => {
    setConnectorBusyId(connectorId);
    const name = connectors.find((c) => c.id === connectorId)?.provider ?? 'Service';
    try { await disconnectConnector(apiConfig, connectorId); toastConnector('disconnected', FORMAT_PROVIDER_NAME[name as ConnectorProvider] ?? name); await refreshConnectors(); }
    catch (err) { toastApiError(err, 'Couldn\'t disconnect'); }
    finally { setConnectorBusyId(null); }
  };

  /* ─── Icon Handlers ─── */

  const handleIconSelection = (modelId: string, value: string) => {
    setIconOverrides((cur) => {
      const next = { ...cur };
      if (value === INFERRED_ICON_VALUE) delete next[modelId]; else next[modelId] = value;
      return next;
    });
  };

  return {
    // Models
    modelsStatus,
    models,
    sortedModels,
    modelOptions,
    availableModelIds,
    // Routing
    preferencesStatus,
    modelPreferences,
    routingDirty,
    refreshModelPreferences,
    handleRoutingChange,
    handleDefaultModelChange,
    handleSaveRouting,
    handleResetRouting,
    // Connectors
    providers,
    connectors,
    connectorsLoading,
    connectorBusyProvider,
    connectorBusyId,
    providerCards,
    refreshConnectors,
    handleConnectProvider,
    handleValidateConnector,
    handleDisconnectConnector,
    // Icons
    iconOverrides,
    handleIconSelection,
  };
}
