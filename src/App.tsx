import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useConfig } from './hooks/useConfig';
import { LandingPage } from './components/landing/LandingPage';
import { TasksPage } from './components/tasks/TasksPage';
import { createWorkflow, getModels } from './api/client';
import type { ContextFileUpload } from './api/client';
import { SettingsModal } from './components/SettingsModal';
import { Toaster } from 'sileo';
import { toastApiError } from './lib/toast';
import type { ApiConfig } from './api/client';
import type { ModelIconOverrides } from './lib/modelIcons';

type Screen = 'landing' | 'tasks';
type TaskNav = 'tasks' | 'files' | 'connectors' | 'skills';

interface AppProps {
  clerkEnabled?: boolean;
  authLoaded?: boolean;
  getAuthToken?: () => Promise<string | null>;
  hasSessionAuth?: boolean;
  userLabel?: string | null;
  userAvatarUrl?: string | null;
  onSignIn?: () => Promise<void>;
  onSignOut?: () => Promise<void>;
  modelIconOverrides?: ModelIconOverrides;
  onSaveModelIconOverrides?: (overrides: ModelIconOverrides) => Promise<void>;
}

export default function App({
  clerkEnabled = false,
  authLoaded = true,
  getAuthToken,
  hasSessionAuth = false,
  userLabel,
  userAvatarUrl,
  onSignIn,
  onSignOut,
  modelIconOverrides = {},
  onSaveModelIconOverrides,
}: AppProps) {
  const { config, saveConfig } = useConfig();
  const [screen, setScreen] = useState<Screen>('landing');
  const [activeWorkflow, setActiveWorkflow] = useState<{ id: string; objective: string } | null>(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [pendingObjective, setPendingObjective] = useState('');
  const [pendingContextFiles, setPendingContextFiles] = useState<ContextFileUpload[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [requestedTaskNav, setRequestedTaskNav] = useState<TaskNav>('tasks');
  const [openTaskInFullView, setOpenTaskInFullView] = useState(false);

  const runtimeConfig: ApiConfig = {
    ...config,
    getAuthToken,
    hasAuth: hasSessionAuth,
  };
  const isConfigured = config.baseUrl.trim().length > 0 && hasSessionAuth;

  useEffect(() => {
    if (!isConfigured) return;

    let cancelled = false;
    getModels(runtimeConfig)
      .then((res) => {
        if (cancelled) return;
        const ids = new Set(res.models.map((m) => m.id));
        const preferred =
          (res.default_orchestrator_model && ids.has(res.default_orchestrator_model)
            ? res.default_orchestrator_model
            : res.models[0]?.id) ??
          '';
        setSelectedModel((current) => {
          if (current && ids.has(current)) return current;
          return preferred;
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [config.baseUrl, hasSessionAuth]);

  const handleLandingSubmit = async (objective: string, model: string, contextFiles: ContextFileUpload[] = []) => {
    setSelectedModel(model);

    if (!isConfigured) {
      setPendingObjective(objective);
      setPendingContextFiles(contextFiles);
      setShowSettings(true);
      return;
    }

    try {
        const result = await createWorkflow(runtimeConfig, {
          objective,
          orchestrator_model: model,
          ...(contextFiles.length > 0 ? { context_files: contextFiles } : {}),
        });
      setActiveWorkflow({ id: result.workflow_id, objective });
      setRequestedTaskNav('tasks');
      setOpenTaskInFullView(true);
      setScreen('tasks');
    } catch (err) {
      toastApiError(err, 'Failed to start workflow');
    }
  };

  const handleSaveSettings = async (baseUrl: string) => {
    const newConfig = { baseUrl: baseUrl.trim() };
    const runtimeNewConfig: ApiConfig = {
      ...newConfig,
      getAuthToken,
      hasAuth: hasSessionAuth,
    };
    saveConfig(newConfig);
    setShowSettings(false);

    // If there was a pending objective, create the workflow now
    if (pendingObjective) {
      try {
        const result = await createWorkflow(runtimeNewConfig, {
          objective: pendingObjective,
          orchestrator_model: selectedModel,
          ...(pendingContextFiles.length > 0 ? { context_files: pendingContextFiles } : {}),
        });
        setActiveWorkflow({ id: result.workflow_id, objective: pendingObjective });
        setRequestedTaskNav('tasks');
        setOpenTaskInFullView(true);
        setScreen('tasks');
      } catch (err) {
        toastApiError(err, 'Failed to start workflow');
      }
      setPendingObjective('');
      setPendingContextFiles([]);
    }
  };

  const openTasks = (nav: TaskNav = 'tasks') => {
    setRequestedTaskNav(nav);
    setOpenTaskInFullView(false);
    setScreen('tasks');
  };

  if (clerkEnabled && !authLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-warm">
        <Loader2 size={36} className="animate-spin text-primary" />
      </div>
    );
  }

  if (clerkEnabled && !hasSessionAuth) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-warm px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="font-sans text-xl font-semibold text-primary">Sign in required</div>
          <p className="mt-2 font-sans text-sm text-secondary">
            Sign in with Clerk to use Relay Pro. Configure your server URL in Settings if needed.
          </p>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => void onSignIn?.()}
              className="flex-1 rounded-lg border border-border bg-surface-tertiary px-3 py-2 text-sm font-medium text-primary hover:bg-surface-hover"
            >
              Sign in with Clerk
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-secondary hover:bg-surface-hover"
            >
              Settings
            </button>
          </div>
        </div>
        {showSettings && (
          <SettingsModal
            initialBaseUrl={config.baseUrl}
            requiresAuth
            clerkEnabled={clerkEnabled}
            isSignedIn={hasSessionAuth}
            getAuthToken={getAuthToken}
            onSignIn={onSignIn}
            onSignOut={onSignOut}
            userLabel={userLabel}
            initialModelIconOverrides={modelIconOverrides}
            onSaveModelIconOverrides={onSaveModelIconOverrides}
            onSave={(baseUrl) => void handleSaveSettings(baseUrl)}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Toaster position="top-right" offset={{ top: 16, right: 16 }} />
      {screen === 'landing' ? (
        <LandingPage
          config={runtimeConfig}
          onSubmit={(objective, model, contextFiles) => void handleLandingSubmit(objective, model, contextFiles)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenTasks={openTasks}
          onSignOut={onSignOut}
          isSignedIn={hasSessionAuth}
          userLabel={userLabel}
          userAvatarUrl={userAvatarUrl}
          sidebarCollapsed={sidebarCollapsed}
          onSidebarCollapsedChange={setSidebarCollapsed}
          modelIconOverrides={modelIconOverrides}
        />
      ) : (
        <TasksPage
          config={runtimeConfig}
          initialWorkflowId={activeWorkflow?.id}
          initialObjective={activeWorkflow?.objective}
          selectedModel={selectedModel}
          onSelectedModelChange={setSelectedModel}
          onNavigateToLanding={() => setScreen('landing')}
          onOpenSettings={() => setShowSettings(true)}
          onSignOut={onSignOut}
          isSignedIn={hasSessionAuth}
          userLabel={userLabel}
          userAvatarUrl={userAvatarUrl}
          sidebarCollapsed={sidebarCollapsed}
          onSidebarCollapsedChange={setSidebarCollapsed}
          requestedNav={requestedTaskNav}
          initialTaskFullView={openTaskInFullView}
          modelIconOverrides={modelIconOverrides}
        />
      )}

      {showSettings && (
        <SettingsModal
          initialBaseUrl={config.baseUrl}
          clerkEnabled={clerkEnabled}
          requiresAuth={!hasSessionAuth}
          isSignedIn={hasSessionAuth}
          getAuthToken={getAuthToken}
          onSignIn={onSignIn}
          onSignOut={onSignOut}
          userLabel={userLabel}
          initialModelIconOverrides={modelIconOverrides}
          onSaveModelIconOverrides={onSaveModelIconOverrides}
          onSave={(baseUrl) => void handleSaveSettings(baseUrl)}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
