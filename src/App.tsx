import { Loader2 } from 'lucide-react';
import { LandingPage } from './components/landing/LandingPage';
import { TasksPage } from './components/tasks/TasksPage';
import { SettingsModal } from './components/SettingsModal';
import { SettingsPage } from './components/SettingsPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from 'sileo';
import { BrandMark, BrandWordmark } from './components/branding/Brand';
import { useAppState } from './hooks/useAppState';
import { AppModals } from './AppModals';
import type { AppProps, TaskNav } from './appTypes';

export default function App(props: AppProps) {
  const {
    clerkEnabled = false,
    authLoaded = true,
    hasSessionAuth = false,
    getAuthToken,
    userLabel,
    userAvatarUrl,
    onSignIn,
    onSignOut,
    modelIconOverrides = {},
    onSaveModelIconOverrides,
  } = props;

  const state = useAppState(props);

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
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-light bg-surface-secondary text-primary">
              <BrandMark size={18} className="text-primary" />
            </div>
            <BrandWordmark
              primaryClassName="text-[18px]"
              secondaryClassName="text-[18px]"
            />
          </div>
          <div className="font-sans text-xl font-semibold text-primary">Sign in required</div>
          <p className="mt-2 font-sans text-sm text-secondary">
            Sign in to unlock all features. You can still configure the server URL in Settings.
          </p>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => void onSignIn?.()}
              className="flex-1 rounded-lg border border-border bg-surface-tertiary px-3 py-2 text-sm font-medium text-primary hover:bg-surface-hover"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => state.setShowSettings(true)}
              className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-secondary hover:bg-surface-hover"
            >
              Settings
            </button>
          </div>
        </div>
        {state.showSettings && (
          <SettingsModal
            initialBaseUrl={state.config.baseUrl}
            requiresAuth
            clerkEnabled={clerkEnabled}
            isSignedIn={hasSessionAuth}
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
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className="h-screen flex flex-col" role="main">
      <Toaster
        position="top-right"
        offset={{ top: 18, right: 18 }}
        theme={state.themeMode}
        options={state.toasterOptions}
      />
      {state.screen === 'landing' ? (
        <LandingPage
          config={state.runtimeConfig}
          onSubmit={(objective, model, contextFiles) => void state.handleLandingSubmit(objective, model, contextFiles)}
          onOpenSettings={() => state.setScreen('settings')}
          onOpenTasks={state.openTasks}
          onOpenSearch={() => state.setShowTaskSearch(true)}
          onSignOut={onSignOut}
          isSignedIn={state.effectiveAuth}
          userLabel={userLabel}
          userAvatarUrl={userAvatarUrl}
          sidebarCollapsed={state.sidebarCollapsed}
          onSidebarCollapsedChange={state.setSidebarCollapsed}
          isMobile={state.isMobile}
          modelIconOverrides={modelIconOverrides}
        />
      ) : state.screen === 'settings' ? (
        <SettingsPage
          initialBaseUrl={state.config.baseUrl}
          clerkEnabled={clerkEnabled}
          requiresAuth={!state.effectiveAuth}
          isSignedIn={state.effectiveAuth}
          getAuthToken={getAuthToken}
          onSignIn={onSignIn}
          onSignOut={onSignOut}
          userLabel={userLabel}
          userAvatarUrl={userAvatarUrl}
          initialModelIconOverrides={modelIconOverrides}
          onSaveModelIconOverrides={onSaveModelIconOverrides}
          onSave={(baseUrl) => void state.handleSaveSettings(baseUrl)}
          onBack={() => state.setScreen('tasks')}
          sidebarCollapsed={state.sidebarCollapsed}
          onSidebarCollapsedChange={state.setSidebarCollapsed}
          isMobile={state.isMobile}
          onNavigateToLanding={() => state.setScreen('landing')}
          onOpenTasks={(nav) => state.openTasks(nav as TaskNav)}
          onOpenSearch={() => state.setShowTaskSearch(true)}
        />
      ) : (
        <TasksPage
          config={state.runtimeConfig}
          initialWorkflowId={state.activeWorkflow?.id}
          initialObjective={state.activeWorkflow?.objective}
          selectedModel={state.selectedModel}
          onSelectedModelChange={state.setSelectedModel}
          onNavigateToLanding={() => state.setScreen('landing')}
          onOpenSettings={() => state.setScreen('settings')}
          onOpenSearch={() => state.setShowTaskSearch(true)}
          onSignOut={onSignOut}
          isSignedIn={state.effectiveAuth}
          userLabel={userLabel}
          userAvatarUrl={userAvatarUrl}
          sidebarCollapsed={state.sidebarCollapsed}
          onSidebarCollapsedChange={state.setSidebarCollapsed}
          isMobile={state.isMobile}
          requestedNav={state.requestedTaskNav}
          initialTaskFullView={state.openTaskInFullView}
          modelIconOverrides={modelIconOverrides}
        />
      )}

      <AppModals state={state} appProps={props} />
    </div>
    </ErrorBoundary>
  );
}
