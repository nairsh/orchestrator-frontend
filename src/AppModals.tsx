import { lazy, Suspense } from 'react';
import { useWorkflows } from './hooks/useWorkflows';
import type { AppState } from './hooks/useAppState';
import type { AppProps, TaskNav } from './appTypes';

const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));
const CommandPalette = lazy(() => import('./components/CommandPalette').then(m => ({ default: m.CommandPalette })));
const TaskSearchDialog = lazy(() => import('./components/TaskSearchDialog').then(m => ({ default: m.TaskSearchDialog })));
const KeyboardShortcutsOverlay = lazy(() => import('./components/KeyboardShortcuts').then(m => ({ default: m.KeyboardShortcutsOverlay })));
const OnboardingModal = lazy(() => import('./components/OnboardingModal').then(m => ({ default: m.OnboardingModal })));

interface AppModalsProps {
  state: AppState;
  appProps: AppProps;
}

export function AppModals({ state, appProps }: AppModalsProps) {
  const {
    clerkEnabled = false,
    getAuthToken,
    onSignIn,
    onSignOut,
    userLabel,
    modelIconOverrides = {},
    onSaveModelIconOverrides,
  } = appProps;

  // Only fetch workflows when the command palette is open
  const { workflows: paletteWorkflows } = useWorkflows(state.runtimeConfig, state.showCommandPalette);

  return (
    <>
      {state.showSettings && (
        <Suspense fallback={null}>
          <SettingsModal
          initialBaseUrl={state.config.baseUrl}
          clerkEnabled={clerkEnabled}
          requiresAuth={!state.effectiveAuth}
          isSignedIn={state.effectiveAuth}
          getAuthToken={getAuthToken}
          onSignIn={onSignIn}
          onSignOut={onSignOut}
          userLabel={userLabel}
          initialModelIconOverrides={modelIconOverrides}
          onSaveModelIconOverrides={onSaveModelIconOverrides}
          onSave={(baseUrl) => void state.handleSaveSettings(baseUrl)}
          onClose={() => state.setShowSettings(false)}
        />
        </Suspense>
      )}

      {state.showCommandPalette && (
        <Suspense fallback={null}>
          <CommandPalette
          open={state.showCommandPalette}
          onClose={() => state.setShowCommandPalette(false)}
          workflows={paletteWorkflows}
          onNavigate={(target) => {
            state.setShowCommandPalette(false);
            if (target === 'landing') state.setScreen('landing');
            else state.openTasks(target as TaskNav);
          }}
          onSelectWorkflow={(id, objective) => {
            state.setShowCommandPalette(false);
            state.selectWorkflow(id, objective);
          }}
          onOpenSettings={() => {
            state.setShowCommandPalette(false);
            state.setScreen('settings');
          }}
          onNewWorkflow={() => {
            state.setShowCommandPalette(false);
            state.setScreen('landing');
            window.dispatchEvent(new CustomEvent('relay:focus-input'));
          }}
        />
        </Suspense>
      )}

      {state.showTaskSearch && (
        <Suspense fallback={null}>
          <TaskSearchDialog
          open={state.showTaskSearch}
          onClose={() => state.setShowTaskSearch(false)}
          config={state.runtimeConfig}
          onSelectWorkflow={(id, objective) => {
            state.setShowTaskSearch(false);
            state.selectWorkflow(id, objective);
          }}
        />
        </Suspense>
      )}

      {state.showShortcutsOverlay && (
        <Suspense fallback={null}>
          <KeyboardShortcutsOverlay
          open={state.showShortcutsOverlay}
          onClose={() => state.setShowShortcutsOverlay(false)}
        />
        </Suspense>
      )}

      {state.showOnboarding && (
        <Suspense fallback={null}>
          <OnboardingModal onClose={() => state.setShowOnboarding(false)} />
        </Suspense>
      )}
    </>
  );
}
