import type { WorkflowSummary } from '../../api/types';
import { IconFolder } from '../icons/CustomIcons';

interface SidebarWorkflowsProps {
  workflows: WorkflowSummary[];
  pinnedIds?: Set<string>;
  onSelectWorkflow?: (id: string, objective: string) => void;
  getDisplayName?: (id: string) => string | null | undefined;
}

export function SidebarWorkflows({ workflows, pinnedIds, onSelectWorkflow, getDisplayName }: SidebarWorkflowsProps) {
  const starred = pinnedIds
    ? workflows.filter((w) => pinnedIds.has(w.id))
    : [];
  const recents = workflows
    .filter((w) => !pinnedIds?.has(w.id))
    .slice(0, 6);

  return (
    <>
      {/* Starred section */}
      {starred.length > 0 && (
        <>
          <div className="mx-1 my-3 h-px bg-sidebar-sep" />
          <div className="px-2 mb-1">
            <span className="text-[11.5px] font-medium tracking-wide uppercase text-sidebar-accent">
              Starred
            </span>
          </div>
          <div className="flex flex-col gap-[1px]">
            {starred.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => onSelectWorkflow?.(w.id, w.objective)}
                className="w-full flex items-center gap-2 px-2 py-[5px] rounded-md border-none bg-transparent cursor-pointer hover:bg-surface-hover transition-colors duration-200 text-left"
              >
                <IconFolder size={14} className="text-secondary flex-shrink-0" />
                <span className="text-[13px] text-primary truncate">{(getDisplayName?.(w.id) ?? w.objective) || 'Untitled task'}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Recents section */}
      {recents.length > 0 && (
        <>
          <div className="mx-1 my-3 h-px bg-sidebar-sep" />
          <div className="px-2 mb-1">
            <span className="text-[11.5px] font-medium tracking-wide uppercase text-sidebar-accent">
              Recents
            </span>
          </div>
          <div className="flex flex-col gap-[1px] overflow-y-auto flex-1 min-h-0">
            {recents.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => onSelectWorkflow?.(w.id, w.objective)}
                className="w-full flex items-center px-2 py-[5px] rounded-md border-none bg-transparent cursor-pointer hover:bg-surface-hover transition-colors duration-200 text-left"
              >
                <span className="text-[13px] text-secondary truncate">{(getDisplayName?.(w.id) ?? w.objective) || 'Untitled task'}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
