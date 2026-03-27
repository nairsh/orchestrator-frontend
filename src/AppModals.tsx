import { SettingsModal } from './components/SettingsModal';
import { CommandPalette } from './components/CommandPalette';
import { TaskSearchDialog } from './components/TaskSearchDialog';
import { KeyboardShortcutsOverlay } from './components/KeyboardShortcuts';
import { OnboardingModal } from './components/OnboardingModal';
import { useWorkflows } from './hooks/useWorkflows';
import type { AppState } from './hooks/useAppState';
import type { AppProps, TaskNav } from './appTypes';

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
      )}

      {state.showCommandPalette && (
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
      )}

      {state.showTaskSearch && (
        <TaskSearchDialog
          open={state.showTaskSearch}
          onClose={() => state.setShowTaskSearch(false)}
          config={state.runtimeConfig}
          onSelectWorkflow={(id, objective) => {
            state.setShowTaskSearch(false);
            state.selectWorkflow(id, objective);
          }}
        />
      )}

      {state.showShortcutsOverlay && (
        <KeyboardShortcutsOverlay
          open={state.showShortcutsOverlay}
          onClose={() => state.setShowShortcutsOverlay(false)}
        />
      )}

      {state.showOnboarding && (
        <OnboardingModal onClose={() => state.setShowOnboarding(false)} />
      )}
    </>
  );
}
