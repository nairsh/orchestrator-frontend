import type { ClarificationOption, FeedEntry, LiveTask } from '../../api/types';

export interface PendingClarification {
  question: string;
  options?: ClarificationOption[];
  allowCustom: boolean;
}

export interface WorkflowStreamState {
  feed: FeedEntry[];
  liveTasks: LiveTask[];
  isTerminal: boolean;
  /** True once REST hydration has completed (initial state loaded from server). */
  hydrated: boolean;
  currentActivity: string;
  thinkingText: string;
  isStale: boolean;
  workflowStatus: string;
  error?: string;
  pendingClarification?: PendingClarification;
  startedAt?: string | null;
  endedAt?: string | null;
  sendMessage: (text: string) => Promise<void>;
  handleApproval: (taskId: string, approved: boolean) => Promise<void>;
  handleBashApproval: (approvalId: string, approved: boolean) => Promise<void>;
}

export const STALE_THRESHOLD_MS = 30_000;
export const MAX_RECONNECT_ATTEMPTS = 3;
