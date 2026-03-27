import type { FeedEntry, LiveTask } from '../../api/types';

export interface WorkflowStreamState {
  feed: FeedEntry[];
  liveTasks: LiveTask[];
  isTerminal: boolean;
  currentActivity: string;
  isStale: boolean;
  workflowStatus: string;
  error?: string;
  sendMessage: (text: string) => Promise<void>;
  handleApproval: (taskId: string, approved: boolean) => Promise<void>;
}

export const STALE_THRESHOLD_MS = 30_000;
export const MAX_RECONNECT_ATTEMPTS = 3;
