import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="absolute top-2 right-2 flex items-center justify-center rounded-md border border-border-light bg-surface p-1.5 text-placeholder hover:text-secondary hover:bg-surface-tertiary transition-colors cursor-pointer"
      aria-label="Copy to clipboard"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {
  const cls = ['md', className].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ children, href, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          code: ({ children, className, ...props }) => {
            const text = String(children ?? '');
            const isBlock = className?.includes('language-');
            if (!isBlock) {
              return (
                <code className={className} {...props}>
                  {text}
                </code>
              );
            }
            return (
              <div className="relative group">
                <pre>
                  <code className={className} {...props}>
                    {text}
                  </code>
                </pre>
                <CopyButton text={text} />
              </div>
            );
          },
          table: ({ children, ...props }) => (
            <div className="md-table-wrap">
              <table {...props}>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
