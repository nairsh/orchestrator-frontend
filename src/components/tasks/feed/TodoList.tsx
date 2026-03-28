import { memo } from 'react';
import { CircleAlert, Loader2, Square, SquareCheck } from 'lucide-react';
import type { TodoDisplay } from './feedHelpers';

export const TodoList = memo(function TodoList({ items }: { items: TodoDisplay[] }) {
  if (items.length === 0) return null;
  return (
    <div className="border border-border-light rounded-lg p-3 bg-surface">
      <div className="font-sans text-xs text-subtle mb-2">Task list</div>
      <div className="flex flex-col gap-2" role="list">
        {items.map((item, idx) => {
          const isDone = item.status === 'completed' || item.status === 'skipped';
          const isRunning = item.status === 'running';
          return (
            <div key={`todo:${idx}:${item.id}`} role="listitem" className="flex items-start gap-2">
              {item.status === 'failed' ? (
                <CircleAlert size={16} className="mt-px flex-shrink-0 text-danger transition-colors duration-300" />
              ) : isRunning ? (
                <Loader2 size={16} className="mt-px flex-shrink-0 text-primary animate-spin transition-colors duration-300" />
              ) : isDone ? (
                <SquareCheck size={16} className="mt-px flex-shrink-0 text-muted transition-colors duration-300" />
              ) : (
                <Square size={16} className="mt-px flex-shrink-0 text-placeholder transition-colors duration-300" />
              )}
              <div className="min-w-0">
                <div className={`font-sans text-sm leading-snug transition-colors duration-300 ${isDone ? 'text-placeholder line-through' : isRunning ? 'text-primary' : 'text-secondary'}`}>
                  {item.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
