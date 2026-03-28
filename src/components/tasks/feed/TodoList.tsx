import { CircleAlert, Square, SquareCheck } from 'lucide-react';
import type { TodoDisplay } from './feedHelpers';

export function TodoList({ items }: { items: TodoDisplay[] }) {
  if (items.length === 0) return null;
  return (
    <div className="border border-border-light rounded-lg p-3 bg-surface">
      <div className="font-sans text-xs text-subtle mb-2">Task list</div>
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const isDone = item.status === 'completed' || item.status === 'skipped';
          return (
            <div key={`${item.id}:${item.description}`} className="flex items-start gap-2">
              {item.status === 'failed' ? (
                <CircleAlert size={16} className="mt-px flex-shrink-0 text-danger transition-colors duration-300" />
              ) : isDone ? (
                <SquareCheck size={16} className="mt-px flex-shrink-0 text-muted transition-colors duration-300" />
              ) : (
                <Square size={16} className="mt-px flex-shrink-0 text-placeholder transition-colors duration-300" />
              )}
              <div className="min-w-0">
                <div className={`font-sans text-sm leading-snug transition-colors duration-300 ${isDone ? 'text-placeholder line-through' : 'text-secondary'}`}>
                  {item.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
