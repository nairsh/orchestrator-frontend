import type {
  FeedEntry,
  LiveTask,
} from '../../api/types';

/** Mutable context passed into the reducer so the caller can read back side-effects. */
export interface EventReducerContext {
  seq: () => number;
  pendingEnvironmentSetup: boolean;
}

export const appendEnvironmentReadyIfPending = (feed: FeedEntry[], ctx: EventReducerContext): FeedEntry[] => {
  if (!ctx.pendingEnvironmentSetup) return feed;
  ctx.pendingEnvironmentSetup = false;

  const last = feed[feed.length - 1];
  if (
    last?.kind === 'system_status' &&
    (last.text === 'Environment started' || last.text === 'Environment ready')
  ) {
    return feed;
  }

  return [...feed, { kind: 'system_status', text: 'Environment started' }];
};

export const upsertActiveTaskGroup = (
  feed: FeedEntry[],
  liveTasks: LiveTask[],
  ctx: EventReducerContext,
): FeedEntry[] => {
  let lastTaskGroupIndex = -1;
  let lastConversationIndex = -1;

  for (let i = feed.length - 1; i >= 0; i -= 1) {
    const entry = feed[i];
    if (lastTaskGroupIndex < 0 && entry.kind === 'task_group') {
      lastTaskGroupIndex = i;
    }
    if (lastConversationIndex < 0 && (entry.kind === 'prompt' || entry.kind === 'user_message')) {
      lastConversationIndex = i;
    }
    if (lastTaskGroupIndex >= 0 && lastConversationIndex >= 0) break;
  }

  if (lastTaskGroupIndex < 0 || lastTaskGroupIndex < lastConversationIndex) {
    const nextTaskGroup: FeedEntry = { kind: 'task_group', taskId: `tg:${ctx.seq()}`, tasks: [...liveTasks] };

    // Search for a terminal entry AFTER the last conversation marker only.
    // Using findIndex from the start would incorrectly match a completion
    // from a previous turn, inserting the task_group in the wrong position.
    const searchStart = Math.max(lastConversationIndex, 0);
    let terminalEntryIndex = -1;
    for (let i = searchStart; i < feed.length; i++) {
      const entry = feed[i];
      if (
        entry.kind === 'completion' ||
        (entry.kind === 'ai_message' && /^workflow failed:/i.test(entry.text.trim()))
      ) {
        terminalEntryIndex = i;
        break;
      }
    }

    if (terminalEntryIndex >= 0) {
      return [...feed.slice(0, terminalEntryIndex), nextTaskGroup, ...feed.slice(terminalEntryIndex)];
    }

    return [...feed, nextTaskGroup];
  }

  return feed.map((entry, idx) =>
    idx === lastTaskGroupIndex && entry.kind === 'task_group'
      ? { ...entry, tasks: [...liveTasks] }
      : entry
  );
};
