"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { LoadingState } from "@/components/ui/loading-state";
import { apiFetch } from "@/hooks/use-api";
import { inr, inrShort } from "@/lib/format";
import type { ProjectEconomics } from "@/server/services/project-economics";

const pct = (n: number | null) => (n == null ? "—" : `${(n * 100).toFixed(1)}%`);

const SEGMENTS = [
  { key: "materialConsumed", label: "Material", cls: "bg-brand-500" },
  { key: "labour", label: "Labour", cls: "bg-amber-500" },
  { key: "other", label: "Other", cls: "bg-violet-500" },
] as const;

export default function ProfitabilityPage() {
  const [rows, setRows] = useState<ProjectEconomics[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/projects/economics").then((j) =>
      j.success ? setRows(j.data.projects) : setError(j.error?.message ?? "Could not load")
    );
  }, []);

  if (error) return <div className="card-pad text-[13px] text-neg">{error}</div>;
  if (!rows) return <LoadingState />;

  const all = rows;
  const live = rows.filter((r) => r.earned > 0).sort((a, b) => (b.margin ?? 0) - (a.margin ?? 0));
  const sum = (k: keyof Pick<ProjectEconomics, "contractValue" | "earned" | "materialConsumed" | "labour" | "other" | "totalCost" | "contribution">, list = all) =>
    list.reduce((s, r) => s + r[k], 0);
  const earned = sum("earned");
  const contribution = sum("contribution");
  const inProgress = all.filter((r) => r.earned > 0 && r.progress < 100).length;
  const boqRows = live
    .filter((r) => r.boq.lines > 0)
    .sort((a, b) => (b.boq.materialVariance ?? 0) - (a.boq.materialVariance ?? 0));
  const maxBar = Math.max(1, ...live.map((r) => Math.max(r.earned, r.totalCost)));

  return (
    <div className="space-y-10">
      <PageHeader
        kicker="Customer · live P&L"
        title="What each job is actually making"
        description="Contract value, cost incurred and contribution at today's completion — project by project, not a month-end guess."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Portfolio contract value"
          value={inrShort(sum("contractValue"))}
          subtitle={`${all.length} projects · ${inProgress} in progress`}
        />
        <KpiCard title="Revenue earned to date" value={inrShort(earned)} subtitle={`of ${inrShort(sum("contractValue"))} contracted`} />
        <KpiCard
          title="Total cost incurred"
          value={inrShort(sum("totalCost"))}
          subtitle={`material ${inrShort(sum("materialConsumed"))} · labour ${inrShort(sum("labour"))} · other ${inrShort(sum("other"))}`}
        />
        <KpiCard
          title="Live contribution"
          value={inrShort(contribution)}
          tone={contribution >= 0 ? "pos" : "neg"}
          subtitle={earned ? `${((contribution / earned) * 100).toFixed(1)}% margin on earned revenue` : undefined}
        />
      </div>

      <p className="card-pad text-[13px] leading-relaxed text-ink-600 border-l-4 !border-l-ink-900">
        Revenue here is recognised at each project&apos;s completion percentage, not the full contract value. Material
        becomes a cost only when it is consumed at site — stock sitting in the warehouse or at a site store is still
        inventory, not spend. Labour and other costs are what has been booked against the job so far.
      </p>

      <section>
        <SectionHeader
          title="Project economics"
          description="Every project with work earned, ranked by contribution margin on revenue earned to date."
        />
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Project</th>
                  <th className="th text-right">Done</th>
                  <th className="th text-right">Earned</th>
                  <th className="th text-right">BOQ material</th>
                  <th className="th text-right">Actual</th>
                  <th className="th text-right">Labour</th>
                  <th className="th text-right">Other</th>
                  <th className="th text-right">Total cost</th>
                  <th className="th text-right">Contribution</th>
                  <th className="th text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {live.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-[13px] text-ink-400">
                      No project has earned revenue yet.
                    </td>
                  </tr>
                )}
                {live.map((r) => (
                  <tr key={r.id} className="hover:bg-paper-100/80">
                    <td className="td">
                      <Link href={`/projects/${r.id}`} className="font-medium text-ink-900 hover:underline">
                        {r.name}
                      </Link>
                      <div className="font-mono text-[11px] text-ink-400">{r.code}</div>
                    </td>
                    <td className="tdn">{r.progress}%</td>
                    <td className="tdn">{inrShort(r.earned)}</td>
                    <td className="tdn text-ink-500">{r.boq.lines ? inrShort(r.boq.materialEarned) : "—"}</td>
                    <td className="tdn">{inrShort(r.materialConsumed)}</td>
                    <td className="tdn">{inrShort(r.labour)}</td>
                    <td className="tdn">{inrShort(r.other)}</td>
                    <td className="tdn">{inrShort(r.totalCost)}</td>
                    <td className={clsx("tdn font-semibold", r.contribution >= 0 ? "text-pos" : "text-neg")}>
                      {inrShort(r.contribution)}
                    </td>
                    <td className={clsx("tdn font-semibold", (r.margin ?? 0) >= 0 ? "text-pos" : "text-neg")}>
                      {pct(r.margin)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {live.length > 0 && (
                <tfoot>
                  <tr>
                    <td className="td font-semibold">Total</td>
                    <td className="tdn" />
                    <td className="tdn font-semibold">{inrShort(sum("earned", live))}</td>
                    <td className="tdn font-semibold text-ink-500">
                      {inrShort(live.reduce((s, r) => s + r.boq.materialEarned, 0))}
                    </td>
                    <td className="tdn font-semibold">{inrShort(sum("materialConsumed", live))}</td>
                    <td className="tdn font-semibold">{inrShort(sum("labour", live))}</td>
                    <td className="tdn font-semibold">{inrShort(sum("other", live))}</td>
                    <td className="tdn font-semibold">{inrShort(sum("totalCost", live))}</td>
                    <td className="tdn font-semibold">{inrShort(sum("contribution", live))}</td>
                    <td className="tdn font-semibold">
                      {sum("earned", live) ? pct(sum("contribution", live) / sum("earned", live)) : "—"}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section>
          <SectionHeader
            title="Cost composition by project"
            description="Material, labour and other cost stacked against revenue earned — the remainder is contribution."
          />
          <div className="card-pad space-y-5">
            {live.map((r) => (
              <div key={r.id}>
                <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
                  <span className="font-medium text-ink-900 truncate">{r.name}</span>
                  <span className={clsx("tnum font-semibold", r.contribution >= 0 ? "text-pos" : "text-neg")}>
                    {inrShort(r.contribution)}
                  </span>
                </div>
                <div className="relative mt-1.5 h-3 w-full bg-paper-200 overflow-hidden">
                  <div className="absolute inset-y-0 left-0 flex" style={{ width: `${(r.totalCost / maxBar) * 100}%` }}>
                    {SEGMENTS.map((s) =>
                      r[s.key] > 0 ? (
                        <div
                          key={s.key}
                          className={s.cls}
                          style={{ width: `${(r[s.key] / r.totalCost) * 100}%` }}
                          title={`${s.label} ${inr(r[s.key])}`}
                        />
                      ) : null
                    )}
                  </div>
                  <div
                    className="absolute inset-y-0 border-r-2 border-ink-900"
                    style={{ width: `${(r.earned / maxBar) * 100}%` }}
                    title={`Earned ${inr(r.earned)}`}
                  />
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-ink-500 tnum">
                  <span>Earned {inrShort(r.earned)}</span>
                  {SEGMENTS.map((s) => (
                    <span key={s.key}>
                      {s.label} {inrShort(r[s.key])}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[11px] text-ink-500">
              {SEGMENTS.map((s) => (
                <span key={s.key} className="inline-flex items-center gap-1.5">
                  <span className={clsx("h-2 w-2 rounded-full", s.cls)} /> {s.label}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 border-r-2 border-ink-900" /> Revenue earned
              </span>
            </div>
          </div>
        </section>

        <section>
          <SectionHeader
            title="Material cost vs BOQ"
            description="Actual material consumed against the supply allowance earned at each project's completion."
          />
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">Project</th>
                    <th className="th text-right">Allowance earned</th>
                    <th className="th text-right">Actual</th>
                    <th className="th text-right">Variance</th>
                    <th className="th text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {boqRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-[13px] text-ink-400">
                        No project has a BOQ with earned work yet.
                      </td>
                    </tr>
                  )}
                  {boqRows.map((r) => {
                    const v = r.boq.materialVariance ?? 0;
                    const vp = r.boq.materialEarned ? v / r.boq.materialEarned : 0;
                    return (
                      <tr key={r.id} className={clsx(v > 0 ? "bg-red-50/60 dark:bg-red-950/20" : "hover:bg-paper-100/80")}>
                        <td className="td">
                          <Link href={`/projects/${r.id}`} className="font-medium text-ink-900 hover:underline">
                            {r.name}
                          </Link>
                          <div className="font-mono text-[11px] text-ink-400">{r.code}</div>
                        </td>
                        <td className="tdn">{inrShort(r.boq.materialEarned)}</td>
                        <td className="tdn">{inrShort(r.materialConsumed)}</td>
                        <td className={clsx("tdn font-semibold", v > 0 ? "text-neg" : "text-pos")}>
                          {v > 0 ? "+" : ""}
                          {inrShort(v)}
                        </td>
                        <td className={clsx("tdn", v > 0 ? "text-neg" : "text-pos")}>
                          {v > 0 ? "+" : ""}
                          {(vp * 100).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
