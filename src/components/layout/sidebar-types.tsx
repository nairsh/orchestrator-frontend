import type { ApiConfig } from '../../api/client';
import type { WorkflowSummary } from '../../api/types';
import {
  IconPlus, IconSearch,
  IconTasks, IconFiles, IconConnectors, IconSkills,
} from '../icons/CustomIcons';

export type NavId = 'search' | 'computer' | 'new' | 'tasks' | 'files' | 'connectors' | 'skills';

export interface NavItem {
  id: NavId;
  label: string;
  icon: React.ReactNode;
  group: 'action' | 'page';
}

export const navHotkeys: Partial<Record<NavId, string>> = {
  new: 'n',
  search: 'mod+k',
  tasks: 'g+t',
  files: 'g+f',
  connectors: 'g+c',
  skills: 'g+s',
};

export const getNavItems = (): NavItem[] => [
  { id: 'new',        label: 'New task',    icon: <IconPlus size={17} />,       group: 'action' },
  { id: 'search',     label: 'Search',      icon: <IconSearch size={17} />,     group: 'action' },
  { id: 'tasks',      label: 'Tasks',       icon: <IconTasks size={17} />,      group: 'page' },
  { id: 'files',      label: 'Files',       icon: <IconFiles size={17} />,      group: 'page' },
  { id: 'connectors', label: 'Connectors',  icon: <IconConnectors size={17} />, group: 'page' },
  { id: 'skills',     label: 'Skills',      icon: <IconSkills size={17} />,     group: 'page' },
];

export interface SidebarProps {
  activeNav?: NavId;
  onNavChange?: (id: NavId) => void;
  config?: ApiConfig;
  onOpenSettings?: () => void;
  onSignOut?: () => Promise<void>;
  isSignedIn?: boolean;
  userLabel?: string | null;
  userAvatarUrl?: string | null;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  workflows?: WorkflowSummary[];
  pinnedIds?: Set<string>;
  onSelectWorkflow?: (id: string, objective: string) => void;
  getDisplayName?: (id: string) => string | null | undefined;
}

export const WIDTH_EXPANDED = 240;
export const WIDTH_COLLAPSED = 44;
