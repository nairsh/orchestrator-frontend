import { useCallback, useEffect, useMemo, useState } from 'react';
import { useConfig } from './useConfig';
import { useIsMobile } from './useIsMobile';
import { createWorkflow, getModels } from '../api/client';
import type { ContextFileUpload, ApiConfig } from '../api/client';
import { toastApiError } from '../lib/toast';
import { hasCompletedOnboarding } from '../components/OnboardingModal';
import { useKeyboardShortcuts } from '../components/KeyboardShortcuts';
import type { Screen, TaskNav, AppProps } from '../appTypes';

export function useAppState(props: AppProps) {
  const {
    clerkEnabled = false,
    hasSessionAuth = false,
    getAuthToken,
  } = props;

  const { config, saveConfig } = useConfig();
  const [screen, setScreen] = useState<Screen>('landing');
  const [activeWorkflow, setActiveWorkflow] = useState<{ id: string; objective: string } | null>(null);
  const [selectedModel, setSelectedModelRaw] = useState(() => localStorage.getItem('relay-selected-model') ?? '');
  const setSelectedModel = useCallback((modelOrUpdater: string | ((prev: string) => string)) => {
    setSelectedModelRaw((prev) => {
      const next = typeof modelOrUpdater === 'function' ? modelOrUpdater(prev) : modelOrUpdater;
      if (next) localStorage.setItem('relay-selected-model', next);
      return next;
    });
  }, []);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingObjective, setPendingObjective] = useState('');
  const [pendingContextFiles, setPendingContextFiles] = useState<ContextFileUpload[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile) setSidebarCollapsed(true);
  }, [isMobile]);
  const [requestedTaskNav, setRequestedTaskNav] = useState<TaskNav>('tasks');
  const [openTaskInFullView, setOpenTaskInFullView] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showTaskSearch, setShowTaskSearch] = useState(false);

  // Track theme for Toaster
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  });
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeMode(document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  const toasterOptions = useMemo(() => ({
    roundness: 20,
    fill: themeMode === 'dark' ? '#282624' : '#ffffff',
    styles: {
      title: 'relay-toast-title',
      description: 'relay-toast-description',
    },
  }), [themeMode]);

  const [showOnboarding, setShowOnboarding] = useState(() => !hasCompletedOnboarding());
  const [showShortcutsOverlay, setShowShortcutsOverlay] = useState(false);

  const effectiveAuth = clerkEnabled ? hasSessionAuth : true;

  const runtimeConfig: ApiConfig = {
    ...config,
    getAuthToken,
    hasAuth: effectiveAuth,
  };
  const isConfigured = config.baseUrl.trim().length > 0;

  // Cmd+K / Ctrl+K: Open command palette
  useEffect(() => {
    const handleCmdK = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };
    document.addEventListener('keydown', handleCmdK);
    return () => document.removeEventListener('keydown', handleCmdK);
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'n',
      action: () => {
        setScreen('landing');
        window.dispatchEvent(new CustomEvent('relay:focus-input'));
      },
      description: 'New task',
    },
    {
      key: '?',
      shift: true,
      action: () => setShowShortcutsOverlay(true),
      description: 'Show keyboard shortcuts',
    },
  ]);

  // ⌘+Shift navigation: O→Tasks, E→Files, L→Connectors, K→Skills
  useEffect(() => {
    const NAV_MAP: Record<string, TaskNav | 'tasks'> = { o: 'tasks', e: 'files', l: 'connectors', k: 'skills' };

    const handler = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) return;

      if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
        const nav = NAV_MAP[e.key.toLowerCase()];
        if (nav) {
          e.preventDefault();
          setScreen('tasks');
          setRequestedTaskNav(nav === 'tasks' ? 'tasks' : nav);
          setShowShortcutsOverlay(false);
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Listen for notification-triggered workflow selection
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string; objective: string }>).detail;
      if (detail?.id) {
        setActiveWorkflow(detail);
        setRequestedTaskNav('tasks');
        setOpenTaskInFullView(true);
        setScreen('tasks');
      }
    };
    window.addEventListener('relay:select-workflow', handler);
    return () => window.removeEventListener('relay:select-workflow', handler);
  }, []);

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
      .catch((err) => {
        if (!cancelled) {
          toastApiError(err, "Couldn't load available AI options");
        }
      });

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
      toastApiError(err, 'Couldn\'t start task');
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
        toastApiError(err, 'Couldn\'t start task');
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

  const selectWorkflow = (id: string, objective: string) => {
    setActiveWorkflow({ id, objective });
    setRequestedTaskNav('tasks');
    setOpenTaskInFullView(true);
    setScreen('tasks');
  };

  return {
    config,
    runtimeConfig,
    effectiveAuth,

    screen,
    setScreen,
    openTasks,

    activeWorkflow,
    selectedModel,
    setSelectedModel,

    sidebarCollapsed,
    setSidebarCollapsed,
    isMobile,
    requestedTaskNav,
    openTaskInFullView,
    themeMode,
    toasterOptions,

    showSettings,
    setShowSettings,
    showCommandPalette,
    setShowCommandPalette,
    showTaskSearch,
    setShowTaskSearch,
    showShortcutsOverlay,
    setShowShortcutsOverlay,
    showOnboarding,
    setShowOnboarding,

    handleLandingSubmit,
    handleSaveSettings,
    selectWorkflow,
  };
}

export type AppState = ReturnType<typeof useAppState>;
