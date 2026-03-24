import { useState } from 'react';
import { Terminal, ChevronDown } from 'lucide-react';

interface BashBlockProps {
  toolName: string;
  input: unknown;
  status: 'running' | 'done' | 'failed';
}

export function BashBlock({ toolName, input, status }: BashBlockProps) {
  const [expanded, setExpanded] = useState(false);

  const inp = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  const command =
    typeof input === 'string'
      ? input
      : (inp.command ?? inp.pattern ?? inp.query ?? inp.cmd ?? JSON.stringify(input))?.toString() ?? '';

  const labelMap: Record<string, string> = {
    bash: '$',
    grep: 'grep',
    glob: 'glob',
  };
  const label = labelMap[toolName] ?? '$';

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden my-1.5 transition-all duration-150">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-surface-hover transition-colors duration-150 cursor-pointer"
      >
        <Terminal size={15} className="text-muted flex-shrink-0" />
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono bg-surface-tertiary text-secondary px-1.5 py-0.5 rounded flex-shrink-0">
              {label}
            </span>
            <span className="text-primary font-mono text-xs truncate">{command.slice(0, 80)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {status === 'running' && <div className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse" />}
          {status === 'done' && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
          {status === 'failed' && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
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
        <div className="bg-surface-tertiary rounded-b-xl px-3.5 py-2.5 border-t border-border-light">
          <pre className="text-xs text-secondary whitespace-pre-wrap break-all font-mono max-h-40 overflow-auto leading-relaxed">
            {command}
          </pre>
        </div>
      </div>
    </div>
  );
}
