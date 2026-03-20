import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
              <pre>
                <code className={className} {...props}>
                  {text}
                </code>
              </pre>
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
