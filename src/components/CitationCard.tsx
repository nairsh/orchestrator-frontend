import { Globe } from 'lucide-react';

interface CitationCardProps {
  index: number;
  url: string;
  title?: string;
  snippet?: string;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).origin;
    return `${domain}/favicon.ico`;
  } catch {
    return '';
  }
}

export function CitationCard({ index, url, title, snippet }: CitationCardProps) {
  const domain = extractDomain(url);
  const favicon = getFaviconUrl(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2.5 px-3 py-2 rounded-lg border border-border-light bg-surface-secondary/50 hover:bg-surface-hover hover:border-border transition-colors duration-200 no-underline group"
    >
      <span className="flex items-center justify-center w-5 h-5 rounded bg-surface-tertiary text-2xs font-bold text-muted flex-shrink-0 mt-0.5">
        {index}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {favicon ? (
            <img
              src={favicon}
              alt=""
              className="w-3.5 h-3.5 rounded-sm"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <Globe size={12} className="text-muted" />
          )}
          <span className="text-2xs text-muted truncate">{domain}</span>
        </div>
        {title && (
          <div className="text-sm font-medium text-primary mt-0.5 truncate group-hover:text-info transition-colors duration-200">
            {title}
          </div>
        )}
        {snippet && (
          <p className="text-xs text-muted mt-0.5 line-clamp-2">{snippet}</p>
        )}
      </div>
    </a>
  );
}

// Parse citation markers like [1], [2] from text and extract URLs
export function parseCitations(text: string): { cleanText: string; citations: Array<{ index: number; url: string }> } {
  const citations: Array<{ index: number; url: string }> = [];
  const urlPattern = /\[(\d+)\]\s*(?:\(?(https?:\/\/[^\s\)]+)\)?)/g;
  let match;

  while ((match = urlPattern.exec(text)) !== null) {
    citations.push({ index: parseInt(match[1], 10), url: match[2] });
  }

  // Remove citation reference lines from text
  const cleanText = text.replace(/\n*\[(\d+)\]\s*(?:\(?(https?:\/\/[^\s\)]+)\)?)\s*/g, '').trim();

  return { cleanText, citations };
}
