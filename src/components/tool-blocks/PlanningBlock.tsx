export function PlanningBlock() {
  return (
    <div className="flex items-center gap-2.5 py-2 px-1 my-1">
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-placeholder animate-bounce" />
        <div className="w-1.5 h-1.5 rounded-full bg-placeholder animate-bounce [animation-delay:150ms]" />
        <div className="w-1.5 h-1.5 rounded-full bg-placeholder animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-xs text-muted">Planning next step…</span>
    </div>
  );
}
