import { useEffect, useState } from 'react';
import type { AppConfig } from '../../hooks/useConfig';
import { Sidebar } from '../layout/Sidebar';
import { TaskList } from './TaskList';
import { TaskDetail } from './TaskDetail';
import { useWorkflows } from '../../hooks/useWorkflows';
import type { WorkflowStatusFilter } from '../dropdowns/StatusFilterDropdown';
import { FilesPage } from '../files/FilesPage';
import { ConnectorsPage } from '../connectors/ConnectorsPage';
import { ChatModal } from '../chat/ChatModal';
import { ResizableDivider } from '../ui/ResizableDivider';
import { SkillsPage } from '../skills/SkillsPage';

interface TasksPageProps {
  config: AppConfig;
  initialWorkflowId?: string;
  initialObjective?: string;
  initialTaskFullView?: boolean;
  selectedModel: string;
  onNavigateToLanding?: () => void;
  onOpenSettings?: () => void;
  sidebarCollapsed?: boolean;
  onSidebarCollapsedChange?: (collapsed: boolean) => void;
  requestedNav?: 'tasks' | 'files' | 'connectors' | 'skills';
}

const DEFAULT_TASK_LIST_WIDTH = 320;
const MIN_TASK_LIST_WIDTH = 240;
const MAX_TASK_LIST_WIDTH = 600;

export function TasksPage({ config, initialWorkflowId, initialObjective, initialTaskFullView = false, selectedModel, onNavigateToLanding, onOpenSettings, sidebarCollapsed, onSidebarCollapsedChange, requestedNav }: TasksPageProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialWorkflowId ?? null);
  const [selectedObjective, setSelectedObjective] = useState<string>(initialObjective ?? '');
  const [activeNav, setActiveNav] = useState<'search' | 'tasks' | 'files' | 'connectors' | 'skills'>('tasks');
  const [statusFilter, setStatusFilter] = useState<WorkflowStatusFilter>(undefined);
  const [chatOpen, setChatOpen] = useState(false);
  const [taskFullView, setTaskFullView] = useState(Boolean(initialTaskFullView && initialWorkflowId));
  const [animateFromLanding, setAnimateFromLanding] = useState(Boolean(initialTaskFullView && initialWorkflowId));
  const [taskListWidth, setTaskListWidth] = useState(DEFAULT_TASK_LIST_WIDTH);

  const { workflows, loading, refresh } = useWorkflows(config, true, statusFilter);

  const handleSelect = (id: string, objective: string) => {
    setSelectedId(id);
    setSelectedObjective(objective);
    setChatOpen(false);
    setTaskFullView(false);
    setAnimateFromLanding(false);
  };

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

  return (
    <div className="flex h-full overflow-hidden app-ui" style={{ background: '#FAF8F4' }}>
      <Sidebar
        activeNav={activeNav}
        config={config}
        onOpenSettings={onOpenSettings}
        collapsed={sidebarCollapsed}
        onCollapsedChange={onSidebarCollapsedChange}
        onNavChange={(id) => {
          if (id === 'search') {
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
            activeModel={selectedModel}
            animateInputEntry={animateFromLanding}
          />
        ) : (
          <>
            <div
              data-task-list
              style={{ width: taskListWidth, minWidth: taskListWidth, flexShrink: 0 }}
            >
            <TaskList
              workflows={workflows}
              selectedId={selectedId}
              onSelect={handleSelect}
              config={config}
                selectedModel={selectedModel}
                onRefresh={refresh}
                loading={loading}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
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
              />
            ) : selectedId ? (
              <TaskDetail
                key={selectedId}
                workflowId={selectedId}
                objective={selectedObjective}
                config={config}
                onCollapse={() => setSelectedId(null)}
                onOpenFullChat={() => setTaskFullView(true)}
                activeModel={selectedModel}
              />
            ) : (
              <div
                className="flex-1 flex items-center justify-center"
                style={{ fontFamily: 'Inter', fontSize: 14, color: '#999999' }}
              >
                Select a task to view details
              </div>
            )}
          </>
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
