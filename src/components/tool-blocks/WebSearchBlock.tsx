import { useState } from 'react';
import { Globe, ChevronDown } from 'lucide-react';

interface WebSearchBlockProps {
  toolName: string;
  input: unknown;
  status: 'running' | 'done' | 'failed';
}

export function WebSearchBlock({ toolName, input, status }: WebSearchBlockProps) {
  const [expanded, setExpanded] = useState(false);

  const query =
    typeof input === 'string'
      ? input
      : typeof input === 'object' && input !== null
      ? (input as Record<string, unknown>).query?.toString() ??
        (input as Record<string, unknown>).url?.toString() ??
        JSON.stringify(input)
      : String(input);

  const label = toolName === 'fetch_url' ? 'Fetching URL' : 'Searching the web';

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden my-1.5 transition-all duration-150">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
      >
        <Globe size={15} className="text-blue-500 flex-shrink-0" />
        <div className="flex-1 text-left min-w-0">
          <div className="text-xs text-muted font-medium">{label}</div>
          <div className="text-primary truncate mt-0.5 text-xs">{query}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {status === 'running' && (
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          )}
          {status === 'done' && (
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          )}
          {status === 'failed' && (
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          )}
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
            {JSON.stringify(input, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
