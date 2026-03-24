export function PlanningBlock() {
  return (
    <div className="flex items-center gap-2.5 py-2 px-1 my-1">
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-placeholder animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-placeholder animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-placeholder animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-xs text-muted">Planning next step…</span>
    </div>
  );
}
