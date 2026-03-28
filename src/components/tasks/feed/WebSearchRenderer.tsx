import { Search } from 'lucide-react';
import type { SearchResultDisplay } from './feedHelpers';

export function WebSearchRenderer({
  query,
  isRunning,
  searchResults,
}: {
  query: string;
  isRunning: boolean;
  searchResults: SearchResultDisplay[];
}) {
  return (
    <div className="flex flex-col gap-2">
      {query && (
        <div className="inline-flex items-center gap-1.5 self-start rounded-sm bg-surface-warm border border-border-light px-2 py-0.5 fade-in-soft">
          <Search size={13} className="text-placeholder flex-shrink-0" />
          <span className="font-mono text-xs tracking-wide uppercase text-placeholder truncate max-w-[420px]">
            {query}
          </span>
        </div>
      )}
      <div className="font-sans text-sm text-secondary">Reading sources · {searchResults.length}</div>
      <div className="rounded-lg border border-border-light bg-surface overflow-hidden px-2 py-1.5 flex flex-col gap-0.5 fade-in-soft">
        {searchResults.length === 0 && (
          <div className="px-1.5 py-1.5 font-sans text-xs text-placeholder">
            {isRunning ? 'Searching sources…' : 'No sources returned'}
          </div>
        )}
        {searchResults.map((result, idx) => (
          <a
            key={`${result.resolvedUrl}:${idx}`}
            href={result.resolvedUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-sm px-2 py-1 hover:bg-surface-warm transition-colors duration-200 no-underline fade-in-up-soft"
            style={{ animationDelay: `${Math.min(idx * 28, 220)}ms` }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={`https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(result.resolvedUrl)}`}
                alt=""
                aria-hidden="true"
                className="w-4 h-4 rounded-full flex-shrink-0"
                loading="lazy"
              />
              <span className="font-sans text-xs text-primary truncate">{result.title}</span>
              <span className="font-mono text-2xs text-placeholder truncate">{result.domain}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
