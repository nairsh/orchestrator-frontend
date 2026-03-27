import { useState } from 'react';
import { Zap, ChevronDown } from 'lucide-react';
import { Highlighter } from '@lobehub/ui';
import { Tooltip } from '@lobehub/ui';

interface GenericToolBlockProps {
  toolName: string;
  input: unknown;
  status: 'running' | 'done' | 'failed';
}

export function GenericToolBlock({ toolName, input, status }: GenericToolBlockProps) {
  const [expanded, setExpanded] = useState(false);

  const preview =
    typeof input === 'string'
      ? input.slice(0, 80)
      : JSON.stringify(input).slice(0, 80);

  const statusTooltip = status === 'running' ? 'Running' : status === 'done' ? 'Completed' : 'Failed';

  return (
    <div className="rounded-xl border border-border-light bg-surface overflow-hidden my-1.5 transition-all duration-200">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-surface-hover transition-colors duration-200 cursor-pointer"
      >
        <Zap size={15} className="text-status-paused flex-shrink-0" />
        <div className="flex-1 text-left min-w-0">
          <div className="text-xs text-muted font-medium font-mono">{toolName}</div>
          <div className="text-primary text-xs truncate mt-0.5">{preview}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Tooltip title={statusTooltip}>
            <div>
              {status === 'running' && <div className="w-1.5 h-1.5 rounded-full bg-status-paused animate-pulse" />}
              {status === 'done' && <div className="w-1.5 h-1.5 rounded-full bg-success" />}
              {status === 'failed' && <div className="w-1.5 h-1.5 rounded-full bg-danger" />}
            </div>
          </Tooltip>
          <ChevronDown
            size={14}
            className={`text-muted transition-transform duration-200 ${expanded ? 'rotate-0' : '-rotate-90'}`}
          />
        </div>
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          expanded ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-border-subtle">
          <Highlighter language="json" copyable variant="filled">
            {JSON.stringify(input, null, 2)}
          </Highlighter>
        </div>
      </div>
    </div>
  );
}
