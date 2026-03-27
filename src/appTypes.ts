import type { ModelIconOverrides } from './lib/modelIcons';

export type Screen = 'landing' | 'tasks' | 'settings';
export type TaskNav = 'tasks' | 'files' | 'connectors' | 'skills';

export interface AppProps {
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
