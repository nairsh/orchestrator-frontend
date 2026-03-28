import { useState } from 'react';
import { FileText, ChevronDown } from 'lucide-react';
import { Highlighter, Tooltip } from '@lobehub/ui';
import { getFileName, guessLanguage } from '../../lib/fileUtils';

interface FileBlockProps {
  toolName: string;
  input: unknown;
  status: 'running' | 'done' | 'failed';
}

export function FileBlock({ toolName, input, status }: FileBlockProps) {
  const [expanded, setExpanded] = useState(false);

  const inp = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  const fullPath = (inp.path ?? inp.file_path ?? inp.filename ?? inp.target ?? '')?.toString() ?? '';
  const filename = getFileName(fullPath);

  const actionMap: Record<string, string> = {
    file_write: 'Writing',
    file_read: 'Reading',
    file_edit: 'Editing',
  };
  const action = actionMap[toolName] ?? 'Accessing';

  const content = typeof inp.content === 'string' ? inp.content : JSON.stringify(input, null, 2);
  const truncatedContent = content.slice(0, 1000) + (content.length > 1000 ? '\n… (truncated)' : '');
  const language = guessLanguage(filename);
  const statusTooltip = status === 'running' ? 'Running' : status === 'done' ? 'Completed' : 'Failed';

  return (
    <div className="rounded-xl border border-border-light bg-surface overflow-hidden my-1.5 transition-all duration-200">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-surface-hover transition-colors duration-200 cursor-pointer"
      >
        <FileText size={15} className="text-warning flex-shrink-0" />
        <div className="flex-1 text-left min-w-0">
          <div className="text-xs text-muted font-medium">{action} file</div>
          <div className="text-primary truncate mt-0.5 font-mono text-xs">{filename}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Tooltip title={statusTooltip}>
            <div>
              {status === 'running' && <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />}
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
        className={`transition-all duration-200 ease-in-out ${
          expanded ? 'max-h-[500px] overflow-y-auto opacity-100' : 'max-h-0 overflow-hidden opacity-0'
        }`}
      >
        <div className="border-t border-border-subtle">
          <Highlighter
            language={language}
            showLanguage
            copyable
            variant="filled"
          >
            {truncatedContent}
          </Highlighter>
        </div>
      </div>
    </div>
  );
}
