import { useState } from 'react';
import { FileText, ChevronDown } from 'lucide-react';

interface FileBlockProps {
  toolName: string;
  input: unknown;
  status: 'running' | 'done' | 'failed';
}

export function FileBlock({ toolName, input, status }: FileBlockProps) {
  const [expanded, setExpanded] = useState(false);

  const inp = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  const filename =
    (inp.path ?? inp.file_path ?? inp.filename ?? inp.target ?? '')
      ?.toString()
      .split('/')
      .pop() ?? 'file';

  const actionMap: Record<string, string> = {
    file_write: 'Writing',
    file_read: 'Reading',
    file_edit: 'Editing',
  };
  const action = actionMap[toolName] ?? 'Accessing';

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden my-1.5 transition-all duration-150">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
      >
        <FileText size={15} className="text-amber-500 flex-shrink-0" />
        <div className="flex-1 text-left min-w-0">
          <div className="text-xs text-muted font-medium">{action} file</div>
          <div className="text-primary truncate mt-0.5 font-mono text-xs">{filename}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {status === 'running' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
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
        <div className="px-3.5 pb-3 border-t border-gray-100">
          <pre className="text-xs text-muted mt-2.5 whitespace-pre-wrap break-all font-mono max-h-40 overflow-auto leading-relaxed">
            {typeof inp.content === 'string'
              ? inp.content.slice(0, 500) + (inp.content.length > 500 ? '…' : '')
              : JSON.stringify(input, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
