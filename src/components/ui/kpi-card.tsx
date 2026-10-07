import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  tone?: "default" | "pos" | "neg" | "warn";
  trend?: { value: number; label: string };
  className?: string;
}

const toneCls = {
  default: "text-ink-900",
  pos: "text-pos",
  neg: "text-neg",
  warn: "text-warn",
};

export function KpiCard({ title, value, subtitle, icon: Icon, tone = "default", trend, className }: KpiCardProps) {
  return (
    <div className={clsx("card-pad", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="label">{title}</div>
        {Icon && <Icon className="h-4 w-4 text-ink-400 shrink-0" strokeWidth={1.7} />}
      </div>
      <div className={clsx("mt-2 font-serif text-[30px] leading-none tnum", toneCls[tone])}>{value}</div>
      {subtitle && <div className="mt-2 text-[12px] text-ink-500 leading-snug">{subtitle}</div>}
      {trend && (
        <div className="mt-2 flex items-center gap-1 text-[12px]">
          <span className={clsx("font-semibold tnum", trend.value >= 0 ? "text-pos" : "text-neg")}>
            {trend.value >= 0 ? "+" : ""}
            {trend.value}%
          </span>
          <span className="text-ink-400">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
