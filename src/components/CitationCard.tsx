import { memo, useState } from 'react';
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
    const { origin } = new URL(url);
    return `${origin}/favicon.ico`;
  } catch {
    return '';
  }
}

export const CitationCard = memo(function CitationCard({ index, url, title }: CitationCardProps) {
  const domain = extractDomain(url);
  const favicon = getFaviconUrl(url);
  const [imgError, setImgError] = useState(false);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-border-light bg-surface-secondary/50 hover:bg-surface-hover hover:border-border transition-colors duration-200 no-underline group max-w-[240px]"
    >
      <span className="flex items-center justify-center w-4 h-4 rounded-full bg-surface-tertiary text-[10px] font-bold text-muted flex-shrink-0">
        {index}
      </span>
      {!imgError ? (
        <img
          src={favicon}
          alt=""
          aria-hidden="true"
          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <Globe size={12} className="text-muted flex-shrink-0" aria-hidden="true" />
      )}
      <span className="text-xs text-primary truncate group-hover:text-info transition-colors duration-200">
        {title || domain}
      </span>
    </a>
  );
});

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
