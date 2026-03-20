import { useState } from 'react';
import { useConfig } from './hooks/useConfig';
import { LandingPage } from './components/landing/LandingPage';
import { TasksPage } from './components/tasks/TasksPage';
import { createWorkflow } from './api/client';
import type { ContextFileUpload } from './api/client';
import { SettingsModal } from './components/SettingsModal';
import { Toaster } from 'sileo';
import { toastApiError } from './lib/toast';

type Screen = 'landing' | 'tasks';
type TaskNav = 'tasks' | 'files' | 'connectors' | 'skills';

export default function App() {
  const { config, saveConfig, isConfigured } = useConfig();
  const [screen, setScreen] = useState<Screen>('landing');
  const [activeWorkflow, setActiveWorkflow] = useState<{ id: string; objective: string } | null>(null);
  const [selectedModel, setSelectedModel] = useState('auto');
  const [showSettings, setShowSettings] = useState(false);
  const [pendingObjective, setPendingObjective] = useState('');
  const [pendingContextFiles, setPendingContextFiles] = useState<ContextFileUpload[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [requestedTaskNav, setRequestedTaskNav] = useState<TaskNav>('tasks');
  const [openTaskInFullView, setOpenTaskInFullView] = useState(false);

  const handleLandingSubmit = async (objective: string, model: string, contextFiles: ContextFileUpload[] = []) => {
    setSelectedModel(model);

    if (!isConfigured) {
      setPendingObjective(objective);
      setPendingContextFiles(contextFiles);
      setShowSettings(true);
      return;
    }

    try {
      const result = await createWorkflow(config, {
        objective,
        ...(model !== 'auto' ? { orchestrator_model: model } : {}),
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

  const handleSaveSettings = async (baseUrl: string, apiKey: string) => {
    const newConfig = { baseUrl: baseUrl.trim(), apiKey: apiKey.trim() };
    saveConfig(newConfig);
    setShowSettings(false);

    // If there was a pending objective, create the workflow now
    if (pendingObjective) {
      try {
        const result = await createWorkflow(newConfig, {
          objective: pendingObjective,
          ...(selectedModel !== 'auto' ? { orchestrator_model: selectedModel } : {}),
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

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Toaster position="top-right" offset={{ top: 16, right: 16 }} />
      {screen === 'landing' ? (
        <LandingPage
          config={config}
          onSubmit={(objective, model, contextFiles) => void handleLandingSubmit(objective, model, contextFiles)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenTasks={openTasks}
          sidebarCollapsed={sidebarCollapsed}
          onSidebarCollapsedChange={setSidebarCollapsed}
        />
      ) : (
        <TasksPage
          config={config}
          initialWorkflowId={activeWorkflow?.id}
          initialObjective={activeWorkflow?.objective}
          selectedModel={selectedModel}
          onNavigateToLanding={() => setScreen('landing')}
          onOpenSettings={() => setShowSettings(true)}
          sidebarCollapsed={sidebarCollapsed}
          onSidebarCollapsedChange={setSidebarCollapsed}
          requestedNav={requestedTaskNav}
          initialTaskFullView={openTaskInFullView}
        />
      )}

      {showSettings && (
        <SettingsModal
          initialBaseUrl={config.baseUrl}
          initialApiKey={config.apiKey}
          onSave={(baseUrl, apiKey) => void handleSaveSettings(baseUrl, apiKey)}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
