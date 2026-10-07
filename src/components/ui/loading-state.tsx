import { clsx } from "clsx";

export function LoadingState({ className, text }: { className?: string; text?: string }) {
  return (
    <div className={clsx("space-y-6", className)} aria-busy="true" aria-label={text || "Loading"}>
      <div className="space-y-3">
        <div className="h-3 w-32 bg-paper-200 animate-pulse" />
        <div className="h-9 w-72 max-w-full bg-paper-200 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-paper-200/70 animate-pulse" />
        ))}
      </div>
      <div className="h-72 bg-paper-200/60 animate-pulse" />
      {text && <p className="text-[12px] text-ink-400">{text}</p>}
    </div>
  );
}
