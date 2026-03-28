import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppConfig } from '../../hooks/useConfig';
import { Sidebar } from '../layout/Sidebar';
import { TaskList } from './TaskList';
import { TaskDetail } from './TaskDetail';
import { useWorkflows } from '../../hooks/useWorkflows';
import { useWorkflowMeta } from '../../hooks/useWorkflowMeta';
import type { WorkflowStatusFilter } from '../dropdowns/StatusFilterDropdown';
import { FilesPage } from '../files/FilesPage';
import { ConnectorsPage } from '../connectors/ConnectorsPage';
import { ChatModal } from '../chat/ChatModal';
import { ResizableDivider } from '../ui/ResizableDivider';
import { SkillsPage } from '../skills/SkillsPage';
import type { ModelIconOverrides } from '../../lib/modelIcons';

interface TasksPageProps {
  config: AppConfig;
  initialWorkflowId?: string;
  initialObjective?: string;
  initialTaskFullView?: boolean;
  selectedModel: string;
  onSelectedModelChange?: (model: string) => void;
  onNavigateToLanding?: () => void;
  onOpenSettings?: () => void;
  onOpenSearch?: () => void;
  onSignOut?: () => Promise<void>;
  isSignedIn?: boolean;
  userLabel?: string | null;
  userAvatarUrl?: string | null;
  sidebarCollapsed?: boolean;
  onSidebarCollapsedChange?: (collapsed: boolean) => void;
  isMobile?: boolean;
  requestedNav?: 'tasks' | 'files' | 'connectors' | 'skills';
  modelIconOverrides?: ModelIconOverrides;
}

const MIN_TASK_LIST_WIDTH = 240;
const MAX_TASK_LIST_WIDTH = 600;
const COMPACT_TASK_LAYOUT_BREAKPOINT = 1180;

function getDefaultTaskListWidth(containerWidth: number): number {
  const half = Math.floor((containerWidth - 12) / 2);
  return Math.max(MIN_TASK_LIST_WIDTH, Math.min(MAX_TASK_LIST_WIDTH, half));
}

export function TasksPage({
  config,
  initialWorkflowId,
  initialObjective,
  initialTaskFullView = false,
  selectedModel,
  onSelectedModelChange,
  onNavigateToLanding,
  onOpenSettings,
  onOpenSearch,
  onSignOut,
  isSignedIn,
  userLabel,
  userAvatarUrl,
  sidebarCollapsed,
  onSidebarCollapsedChange,
  isMobile,
  requestedNav,
  modelIconOverrides,
}: TasksPageProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialWorkflowId ?? null);
  const [selectedObjective, setSelectedObjective] = useState<string>(initialObjective ?? '');
  const [activeNav, setActiveNav] = useState<'search' | 'computer' | 'new' | 'tasks' | 'files' | 'connectors' | 'skills'>('tasks');
  const [statusFilter, setStatusFilter] = useState<WorkflowStatusFilter>(undefined);
  const [chatOpen, setChatOpen] = useState(false);
  const [taskFullView, setTaskFullView] = useState(Boolean(initialTaskFullView && initialWorkflowId));
  const [animateFromLanding, setAnimateFromLanding] = useState(Boolean(initialTaskFullView && initialWorkflowId));
  const [taskListWidth, setTaskListWidth] = useState(MIN_TASK_LIST_WIDTH);
  const [activeModel, setActiveModel] = useState(selectedModel);
  const [splitWidthInitialized, setSplitWidthInitialized] = useState(false);
  const [isCompactTaskLayout, setIsCompactTaskLayout] = useState(false);
  const splitViewRef = useRef<HTMLDivElement>(null);

  const { workflows, loading, error: workflowListError, refresh } = useWorkflows(config, true, statusFilter);
  const { meta, getDisplayName } = useWorkflowMeta();

  const pinnedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [id, m] of Object.entries(meta)) {
      if (m?.pinned) ids.add(id);
    }
    return ids;
  }, [meta]);

  useEffect(() => {
    setActiveModel(selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    if (activeNav !== 'tasks' || taskFullView || splitWidthInitialized) return;
    const containerWidth = splitViewRef.current?.clientWidth;
    if (!containerWidth || containerWidth <= 0) return;
    setTaskListWidth(getDefaultTaskListWidth(containerWidth));
    setSplitWidthInitialized(true);
  }, [activeNav, splitWidthInitialized, taskFullView]);

  const handleModelChange = (model: string) => {
    setActiveModel(model);
    onSelectedModelChange?.(model);
  };

  const handleSelect = (id: string, objective: string) => {
    setSelectedId(id);
    setSelectedObjective(objective);
    setChatOpen(false);
    setTaskFullView(false);
    setAnimateFromLanding(false);
  };

  // ⌘+Shift+C — toggle chat panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        const el = e.target as HTMLElement;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) return;
        e.preventDefault();
        setChatOpen((prev) => !prev);
      }
    };
    const eventHandler = () => setChatOpen((prev) => !prev);
    document.addEventListener('keydown', handler);
    window.addEventListener('relay:toggle-chat', eventHandler);
    return () => {
      document.removeEventListener('keydown', handler);
      window.removeEventListener('relay:toggle-chat', eventHandler);
    };
  }, []);

  const handleWidthChange = (nextWidth: number) => {
    setTaskListWidth(Math.max(MIN_TASK_LIST_WIDTH, Math.min(MAX_TASK_LIST_WIDTH, nextWidth)));
  };

  useEffect(() => {
    if (!animateFromLanding) return;
    const t = setTimeout(() => setAnimateFromLanding(false), 240);
    return () => clearTimeout(t);
  }, [animateFromLanding]);

  useEffect(() => {
    if (!requestedNav) return;
    setActiveNav(requestedNav);
  }, [requestedNav]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const updateCompactLayout = () => {
      setIsCompactTaskLayout(window.innerWidth < COMPACT_TASK_LAYOUT_BREAKPOINT);
    };
    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateCompactLayout, 150);
    };

    updateCompactLayout();
    window.addEventListener('resize', debouncedUpdate);
    return () => {
      window.removeEventListener('resize', debouncedUpdate);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="flex h-full overflow-hidden app-ui bg-surface-warm">
      <Sidebar
        activeNav={activeNav}
        config={config}
        onOpenSettings={onOpenSettings}
        onSignOut={onSignOut}
        isSignedIn={isSignedIn}
        userLabel={userLabel}
        userAvatarUrl={userAvatarUrl}
        collapsed={sidebarCollapsed}
        onCollapsedChange={onSidebarCollapsedChange}
        isMobile={isMobile}
        workflows={workflows}
        pinnedIds={pinnedIds}
        getDisplayName={getDisplayName}
        onSelectWorkflow={(id, objective) => {
          handleSelect(id, objective);
          setActiveNav('tasks');
        }}
        onNavChange={(id) => {
          if (id === 'search') {
            onOpenSearch?.();
          } else if (id === 'computer' || id === 'new') {
            onNavigateToLanding?.();
          } else {
            setActiveNav(id);
          }
        }}
      />

      {activeNav === 'tasks' && (
        taskFullView && selectedId ? (
            <TaskDetail
            key={selectedId}
            workflowId={selectedId}
            objective={selectedObjective}
            config={config}
            onCollapse={() => setTaskFullView(false)}
            onOpenFullChat={() => setTaskFullView(false)}
            fullView
              activeModel={activeModel}
              animateInputEntry={animateFromLanding}
              modelIconOverrides={modelIconOverrides}
            />
        ) : isCompactTaskLayout ? (
          chatOpen ? (
            <ChatModal
              config={config}
              onClose={() => setChatOpen(false)}
              fullscreen
              modelIconOverrides={modelIconOverrides}
            />
          ) : selectedId ? (
            <TaskDetail
              key={selectedId}
              workflowId={selectedId}
              objective={selectedObjective}
              config={config}
              onCollapse={() => setSelectedId(null)}
              onOpenFullChat={() => setTaskFullView(true)}
              activeModel={activeModel}
              modelIconOverrides={modelIconOverrides}
            />
          ) : (
            <div className="flex flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <TaskList
                  workflows={workflows}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                  config={config}
                  selectedModel={activeModel}
                  onSelectModel={handleModelChange}
                  onRefresh={refresh}
                  loading={loading}
                  error={workflowListError}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  modelIconOverrides={modelIconOverrides}
                  onOpenChat={() => {
                    setChatOpen(true);
                    setTaskFullView(false);
                    setSelectedId(null);
                  }}
                  onOpenConnectors={() => setActiveNav('connectors')}
                />
              </div>
            </div>
          )
        ) : (
          <div ref={splitViewRef} className="flex flex-1 min-w-0">
            <div
              data-task-list
              className="flex-shrink-0"
              style={{ width: taskListWidth, minWidth: taskListWidth }}
            >
            <TaskList
              workflows={workflows}
                selectedId={selectedId}
                onSelect={handleSelect}
                config={config}
                selectedModel={activeModel}
                onSelectModel={handleModelChange}
                onRefresh={refresh}
                loading={loading}
                error={workflowListError}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                modelIconOverrides={modelIconOverrides}
              onOpenChat={() => {
                setChatOpen(true);
                setTaskFullView(false);
                setSelectedId(null);
              }}
              onOpenConnectors={() => setActiveNav('connectors')}
            />
            </div>

            <ResizableDivider
              width={taskListWidth}
              onWidthChange={handleWidthChange}
              minWidth={MIN_TASK_LIST_WIDTH}
              maxWidth={MAX_TASK_LIST_WIDTH}
            />

            {chatOpen ? (
              <ChatModal
                config={config}
                onClose={() => setChatOpen(false)}
                fullscreen
                modelIconOverrides={modelIconOverrides}
              />
            ) : selectedId ? (
              <TaskDetail
                key={selectedId}
                workflowId={selectedId}
                objective={selectedObjective}
                config={config}
                onCollapse={() => setSelectedId(null)}
                onOpenFullChat={() => setTaskFullView(true)}
                activeModel={activeModel}
                modelIconOverrides={modelIconOverrides}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-surface-tertiary border border-border-subtle flex items-center justify-center">
                  <span className="text-xl">{workflows.length === 0 ? '🚀' : '⚡'}</span>
                </div>
                <div className="font-sans text-sm font-medium text-muted text-center">
                  {workflows.length === 0 ? 'No tasks yet' : 'Select a task to view details'}
                </div>
                <div className="font-sans text-sm text-placeholder text-center max-w-[220px] leading-relaxed">
                  {workflows.length === 0
                    ? 'Describe what you want to accomplish and Relay Pro will get it done.'
                    : 'Choose from the list or start a new task above'}
                </div>
                {workflows.length === 0 && (
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('relay:focus-input'))}
                    className="mt-2 px-4 py-2 rounded-lg bg-primary text-surface text-sm font-medium font-sans cursor-pointer border-none hover:opacity-90 transition-opacity"
                  >
                    Start your first task
                  </button>
                )}
              </div>
            )}
          </div>
        )
      )}

      {activeNav === 'files' && (
        <FilesPage
          config={config}
          workflows={workflows}
          initialWorkflowId={selectedId}
          onSelectWorkflow={(id, objective) => handleSelect(id, objective)}
        />
      )}

      {activeNav === 'connectors' && (
        <ConnectorsPage
          config={config}
          onWorkflowStarted={(id, objective) => {
            handleSelect(id, objective);
            setActiveNav('tasks');
            refresh();
          }}
        />
      )}

      {activeNav === 'skills' && (
        <SkillsPage config={config} />
      )}
    </div>
  );
}
