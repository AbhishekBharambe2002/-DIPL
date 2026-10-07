import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  kicker?: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, kicker, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-2">
      <div className="min-w-0">
        {kicker && <div className="kicker">{kicker}</div>}
        <h1 className="font-serif text-[30px] sm:text-[38px] leading-[1.1] tracking-tight text-ink-900 mt-1">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function SectionHeader({ title, description, actions }: Omit<PageHeaderProps, "kicker">) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
      <div>
        <h2 className="font-serif text-[22px] leading-tight text-ink-900">{title}</h2>
        {description && <p className="mt-0.5 text-[12.5px] text-ink-500">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
