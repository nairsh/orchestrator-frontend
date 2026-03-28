import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Tooltip, Highlighter } from '@lobehub/ui';

export function BashRenderer({
  command,
  isRunning,
  hasOutput,
  renderedOutput,
  exitCode,
}: {
  command: string;
  isRunning: boolean;
  hasOutput: boolean;
  renderedOutput: string;
  exitCode?: number;
}) {
  // Auto-expand output on failure (non-zero exit code)
  const [showBashOutput, setShowBashOutput] = useState(exitCode !== undefined && exitCode !== 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-lg border border-border-light bg-surface overflow-hidden">
        <div className="px-3 py-1.5 border-b border-border-light flex items-center gap-2">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500'}`} />
          <span className="font-sans text-xs text-placeholder">command</span>
          {exitCode !== undefined && !isRunning && (
            <span className={`font-sans text-[10px] font-medium px-1.5 py-0.5 rounded-full ${exitCode === 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
              {exitCode === 0 ? '✓ 0' : `✗ ${exitCode}`}
            </span>
          )}
          <Tooltip title={showBashOutput ? 'Hide command output' : 'Show command output'}>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!hasOutput) return; setShowBashOutput((v) => !v); }}
              disabled={!hasOutput}
              className={`ml-auto flex items-center justify-center rounded border-none bg-transparent p-0.5 ${
                hasOutput ? 'cursor-pointer text-placeholder hover:text-secondary' : 'cursor-default text-placeholder/50'
              }`}
              aria-label={showBashOutput ? 'Hide command output' : 'Show command output'}
            >
              {showBashOutput ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </Tooltip>
        </div>
        <div className="px-3">
          <Highlighter language="bash" variant="borderless" copyable={false} showLanguage={false} wrap>{command || 'bash command'}</Highlighter>
        </div>
      </div>

      <div
        className="transition-all duration-slow"
        aria-hidden={!showBashOutput || !hasOutput}
        style={{
          maxHeight: showBashOutput && hasOutput ? 'none' : 0,
          opacity: showBashOutput && hasOutput ? 1 : 0,
          overflow: showBashOutput && hasOutput ? 'auto' : 'hidden',
        }}
      >
        {hasOutput && renderedOutput && renderedOutput !== 'Command finished' && (
          <div className="rounded-lg border border-border-light bg-surface overflow-hidden">
            <div className="px-3 py-1.5 border-b border-border-light flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="font-sans text-xs text-placeholder">output</span>
            </div>
            <div className="px-3">
              <Highlighter language="bash" variant="borderless" copyable showLanguage={false} wrap>{renderedOutput}</Highlighter>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
