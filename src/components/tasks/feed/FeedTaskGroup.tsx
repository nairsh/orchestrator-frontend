import { useState } from 'react';
import { Repeat2, ChevronDown, Bot, Pencil, Check, CircleAlert, Loader2, Zap } from 'lucide-react';
import { ModelIcon, resolveModelIconKey, type ModelIconOverrides } from '../../../lib/modelIcons';
import { normalizeStatus, compactModelLabel, agentDisplayName, iconForRecentToolCall, taskActivityLabel } from './feedHelpers';

interface Task {
  id: string;
  description: string;
  agent_type?: string;
  status: string;
  current_activity?: string;
  model?: string;
  recent_tool_calls?: string[];
  tool_calls?: number;
}

export function FeedTaskGroup({
  tasks,
  modelIconOverrides,
}: {
  tasks: Task[];
  modelIconOverrides?: ModelIconOverrides;
}) {
  const [open, setOpen] = useState(true);
  const taskCount = tasks.length;
  const allCompleted = tasks.every((t) => normalizeStatus(t.status) === 'completed' || normalizeStatus(t.status) === 'skipped');
  const anyFailed = tasks.some((t) => normalizeStatus(t.status) === 'failed');
  const headerLabel = allCompleted
    ? (taskCount <= 1 ? 'Completed task' : 'Completed tasks')
    : anyFailed
      ? (taskCount <= 1 ? 'Task failed' : 'Some tasks failed')
      : (taskCount <= 1 ? 'Running task' : 'Running tasks in parallel');
  const isParallel = taskCount > 1;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="flex items-center gap-2 bg-transparent border-none cursor-pointer p-0"
        onClick={() => setOpen((v) => !v)}
      >
        <Repeat2 size={15} className="text-muted" />
        <span className="font-sans text-sm text-muted">{headerLabel}</span>
        <ChevronDown
          size={14}
          className="text-muted transition-transform duration-slow"
          style={{ transform: open ? 'none' : 'rotate(-90deg)' }}
        />
      </button>

      <div
        className="overflow-hidden transition-all duration-slow"
        style={{ maxHeight: open ? 1200 : 0, opacity: open ? 1 : 0 }}
      >
        <div className={`flex flex-col gap-3 mt-0.5 relative ${isParallel ? 'ml-2.5 pl-[22px]' : ''}`}>
          {isParallel && <div className="absolute left-0 top-0 bottom-2.5 w-[1.5px] bg-border" />}
          {tasks.map((task) => {
            const status = normalizeStatus(task.status);
            const modelBadge = compactModelLabel(task.model);
            const agentName = agentDisplayName(task.agent_type);
            const recentToolCalls = Array.isArray(task.recent_tool_calls) ? task.recent_tool_calls.slice(-3) : [];
            const modelProvider = task.model?.includes('/') ? task.model.split('/')[0] : undefined;
            const iconKey = task.model ? resolveModelIconKey(task.model, modelProvider, modelIconOverrides) : undefined;

            return (
              <div key={task.id} className="relative">
                {isParallel && (
                  <div className="absolute -left-[22px] top-0.5 w-4 h-3.5 border-l-[1.5px] border-b-[1.5px] border-border-light rounded-bl-[10px]" />
                )}
                <div className="rounded-xl border border-border-light bg-surface overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-light/70 bg-surface-tertiary">
                    <div className="flex items-center gap-3 min-w-0">
                      <Bot size={18} className="text-muted flex-shrink-0" />
                      <span className="font-sans text-base font-medium text-primary truncate">
                        {agentName} - {task.description}
                      </span>
                      {modelBadge && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border-light px-2 py-0.5 font-sans text-2xs text-secondary bg-surface-warm flex-shrink-0">
                          {iconKey ? <ModelIcon iconKey={iconKey} size={12} /> : null}
                          <span>{modelBadge}</span>
                        </span>
                      )}
                    </div>
                    {status === 'completed' || status === 'skipped' ? (
                      <Check size={15} className="flex-shrink-0 text-muted" />
                    ) : status === 'running' ? (
                      <Loader2 size={15} className="flex-shrink-0 text-muted animate-spin" />
                    ) : (
                      <CircleAlert size={15} className="flex-shrink-0 text-warning" />
                    )}
                  </div>

                  <div className="px-4 py-3 flex items-center gap-2.5">
                    <Pencil size={16} className="text-placeholder flex-shrink-0" />
                    <span className="font-sans text-sm text-secondary truncate">{taskActivityLabel(task)}</span>
                    {(task.tool_calls ?? 0) > 0 && (
                      <span className="ml-auto flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-surface-warm border border-border-light px-2 py-0.5 font-mono text-2xs text-placeholder">
                        <Zap size={10} />
                        {task.tool_calls} {task.tool_calls === 1 ? 'action' : 'actions'}
                      </span>
                    )}
                  </div>

                  {recentToolCalls.length > 0 && (
                    <div className="px-4 pb-3 -mt-1 flex flex-col gap-1.5">
                      {[...recentToolCalls].reverse().map((toolCall, idx) => {
                        const Icon = iconForRecentToolCall(toolCall);
                        const label = toolCall.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                        return (
                          <div key={`${task.id}:${toolCall}:${idx}`} className="flex items-center gap-2 min-w-0">
                            <Icon size={13} className="text-placeholder flex-shrink-0" />
                            <span className="font-sans text-2xs text-placeholder truncate">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
