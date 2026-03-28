import { memo, useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import type { FetchedSourceDisplay } from './feedHelpers';

export const FetchUrlRenderer = memo(function FetchUrlRenderer({
  isRunning,
  fetchedSource,
}: {
  isRunning: boolean;
  fetchedSource: FetchedSourceDisplay | null;
}) {
  const [faviconError, setFaviconError] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-lg border border-border-light bg-surface overflow-hidden px-0 py-0 fade-in-soft">
        {!fetchedSource && (
          <div className="px-1.5 py-1.5 font-sans text-xs text-placeholder flex items-center gap-1.5">
            {isRunning && <Loader2 size={12} className="animate-spin flex-shrink-0" />}
            {isRunning ? 'Fetching URL…' : 'No fetched URL details'}
          </div>
        )}
        {fetchedSource && (
          <a href={fetchedSource.url} target="_blank" rel="noreferrer"
            className="block px-4 py-1 hover:bg-surface-warm transition-colors duration-200 no-underline"
          >
            <div className="flex items-center gap-1.5 min-w-0 h-5">
              {faviconError ? (
                <Globe size={12} className="text-muted flex-shrink-0" aria-hidden="true" />
              ) : (
                <img
                  src={`${new URL(fetchedSource.url).origin}/favicon.ico`}
                  alt=""
                  aria-hidden="true"
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  loading="lazy"
                  onError={() => setFaviconError(true)}
                />
              )}
              <span className="font-sans text-xs text-primary truncate leading-[1]">{fetchedSource.title}</span>
              <span className="font-mono text-2xs text-placeholder truncate leading-[1]">{fetchedSource.domain}</span>
            </div>
          </a>
        )}
      </div>
    </div>
  );
});
