import { clsx } from "clsx";

const tones = {
  green:
    "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800",
  red: "bg-red-50 text-red-800 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800",
  amber:
    "bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800",
  blue: "bg-brand-50 text-brand-700 ring-1 ring-brand-100",
  slate: "bg-paper-200 text-ink-600 ring-1 ring-paper-300",
  violet:
    "bg-violet-50 text-violet-800 ring-1 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-800",
};

export type Tone = keyof typeof tones;

const statusTone: Record<string, Tone> = {
  active: "green",
  approved: "green",
  completed: "green",
  received: "green",
  posted: "green",
  pending: "amber",
  on_hold: "amber",
  waiting: "amber",
  testing: "amber",
  medium: "amber",
  open: "blue",
  in_progress: "blue",
  assigned: "blue",
  installation: "blue",
  survey: "blue",
  confirmed: "blue",
  scheduled: "violet",
  planning: "violet",
  commissioning: "violet",
  maintenance: "violet",
  delayed: "red",
  critical: "red",
  blocked: "red",
  cancelled: "red",
  high: "red",
  draft: "slate",
  todo: "slate",
  inactive: "slate",
  not_started: "slate",
  closed: "slate",
  low: "slate",
};

export function Chip({ tone = "slate", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return <span className={clsx("chip", tones[tone], className)}>{children}</span>;
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = status.toLowerCase();
  return (
    <Chip tone={statusTone[key] ?? "slate"} className={className}>
      {key.replace(/_/g, " ")}
    </Chip>
  );
}

export function Meter({ pct, tone = "brand" }: { pct: number; tone?: "brand" | "pos" | "neg" | "warn" }) {
  const bar = { brand: "bg-brand-500", pos: "bg-pos", neg: "bg-neg", warn: "bg-amber-500" }[tone];
  return (
    <div className="h-1.5 w-full rounded-full bg-paper-200 overflow-hidden">
      <div className={clsx("h-full rounded-full", bar)} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}
