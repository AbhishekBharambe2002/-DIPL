"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Plus, ArrowUpRight } from "lucide-react";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { StatusBadge, Meter } from "@/components/ui/status-badge";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { usePermission } from "@/hooks/use-permission";
import { apiFetch } from "@/hooks/use-api";
import { inr, inrShort, qty } from "@/lib/format";
import type { MaterialRow, ProjectEconomics } from "@/server/services/project-economics";
import { ProjectFormModal } from "./project-form";

interface Data {
  summary: {
    total: number;
    active: number;
    onHold: number;
    contractValue: number;
    earned: number;
    atSite: number;
    totalCost: number;
    contribution: number;
  };
  projects: ProjectEconomics[];
  materials: MaterialRow[];
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "pipeline", label: "Pipeline" },
  { key: "paused", label: "On hold" },
  { key: "completed", label: "Completed" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

function matches(f: FilterKey, status: string) {
  if (f === "all") return true;
  if (f === "active") return status === "active";
  if (f === "pipeline") return ["draft", "planning", "approved"].includes(status);
  if (f === "paused") return ["on_hold", "delayed"].includes(status);
  return status === "completed";
}

function CostBar({ p }: { p: ProjectEconomics }) {
  const base = Math.max(p.earned, p.totalCost, 1);
  const seg = [
    { v: p.materialConsumed, cls: "bg-brand-500", label: "Material" },
    { v: p.labour, cls: "bg-amber-500", label: "Labour" },
    { v: p.other, cls: "bg-violet-500", label: "Other" },
    { v: Math.max(0, p.contribution), cls: "bg-pos", label: "Contribution" },
  ];
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-paper-200" aria-label="Cost composition">
      {seg.map((s) =>
        s.v > 0 ? (
          <div key={s.label} title={`${s.label} ${inr(s.v)}`} className={s.cls} style={{ width: `${(s.v / base) * 100}%` }} />
        ) : null
      )}
    </div>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400">{label}</div>
      <div
        className={clsx(
          "tnum text-[14px] font-semibold mt-0.5",
          tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : "text-ink-900"
        )}
      >
        {value}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const canCreate = usePermission("project.create");
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [materialProject, setMaterialProject] = useState("all");
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    apiFetch("/api/projects/economics").then((j) =>
      j.success ? setData(j.data) : setError(j.error?.message ?? "Could not load projects")
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => data?.projects.filter((p) => matches(filter, p.status)) ?? [], [data, filter]);
  const materialRows = useMemo(
    () => data?.materials.filter((m) => materialProject === "all" || m.projectId === materialProject) ?? [],
    [data, materialProject]
  );

  if (error) return <div className="card-pad text-[13px] text-neg">{error}</div>;
  if (!data) return <LoadingState />;

  const s = data.summary;
  const earnedPct = s.contractValue ? (s.earned / s.contractValue) * 100 : 0;
  const counts = Object.fromEntries(
    FILTERS.map((f) => [f.key, data.projects.filter((p) => matches(f.key, p.status)).length])
  );
  const withMaterial = data.projects.filter((p) => data.materials.some((m) => m.projectId === p.id));

  return (
    <div className="space-y-10">
      <PageHeader
        kicker={`${s.total} projects · contract to contribution`}
        title="Jobs, from BOQ to contribution"
        description="Every scope on the books: material allocated, consumed on site, and the live contribution that follows."
        actions={
          canCreate && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> New project
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Active projects" value={s.active} subtitle={`of ${s.total} total · ${s.onHold} on hold or delayed`} />
        <KpiCard title="Total contract value" value={inrShort(s.contractValue)} subtitle="BOQ total where a BOQ exists" />
        <KpiCard
          title="Revenue earned to date"
          value={inrShort(s.earned)}
          tone="pos"
          subtitle={`${earnedPct.toFixed(1)}% of contract value`}
        />
        <KpiCard title="Material at site" value={inrShort(s.atSite)} subtitle="allocated, not yet consumed or returned" />
      </div>

      <section>
        <SectionHeader
          title="Project-wise economics"
          description="Contract value, material and live contribution, project by project. Open a project for its BOQ and material ledger."
          actions={
            <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter projects">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  role="tab"
                  aria-selected={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  className={clsx(
                    "px-2.5 py-1.5 text-[12px] font-medium border transition-colors",
                    filter === f.key
                      ? "bg-ink-900 text-paper-50 border-ink-900"
                      : "border-paper-300 bg-paper-50 text-ink-600 hover:text-ink-900"
                  )}
                >
                  {f.label} <span className="tnum opacity-60">{counts[f.key]}</span>
                </button>
              ))}
            </div>
          }
        />

        {visible.length === 0 ? (
          <div className="card">
            <EmptyState title="No projects here" description="Try another filter, or create a project." />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="card group flex flex-col hover:shadow-lift hover:border-paper-300 transition-shadow"
              >
                <div className="px-5 pt-5 pb-4 border-b border-paper-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] text-ink-400">{p.code}</div>
                      <h3 className="font-serif text-[21px] leading-tight text-ink-900 mt-0.5 group-hover:underline decoration-1 underline-offset-4">
                        {p.name}
                      </h3>
                      {p.location && <div className="text-[11.5px] text-ink-500 mt-1 truncate">{p.location}</div>}
                    </div>
                    <StatusBadge status={p.status} className="shrink-0" />
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <Meter pct={p.progress} tone={p.progress >= 100 ? "pos" : "brand"} />
                    <span className="tnum text-[11.5px] font-medium text-ink-600 w-10 text-right">{p.progress}%</span>
                  </div>
                </div>
                <div className="px-5 py-4 grid grid-cols-2 gap-x-4 gap-y-3.5 flex-1">
                  <Figure label="Contract value" value={inrShort(p.contractValue)} />
                  <Figure label="Earned revenue" value={inrShort(p.earned)} />
                  <Figure label="Material consumed" value={inrShort(p.materialConsumed)} />
                  <Figure label="At-site stock" value={inrShort(p.atSite)} />
                  <Figure label="Labour + other" value={inrShort(p.labour + p.other)} />
                  <Figure
                    label="Contribution"
                    value={`${inrShort(p.contribution)}${p.margin != null ? ` · ${(p.margin * 100).toFixed(1)}%` : ""}`}
                    tone={p.earned === 0 ? undefined : p.contribution >= 0 ? "pos" : "neg"}
                  />
                </div>
                <div className="px-5 pb-5">
                  <CostBar p={p} />
                  <div className="mt-2 flex items-center justify-between text-[11px] text-ink-400">
                    <span>
                      {p.boq.materialVariance != null && p.boq.materialVariance > 0 ? (
                        <span className="text-neg font-medium">Over BOQ by {inrShort(p.boq.materialVariance)}</span>
                      ) : p.boq.lines > 0 ? (
                        `${p.boq.lines} BOQ lines`
                      ) : (
                        "No BOQ yet"
                      )}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-ink-500 group-hover:text-ink-900">
                      Open <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-500">
          {[
            ["bg-brand-500", "Material"],
            ["bg-amber-500", "Labour"],
            ["bg-violet-500", "Other cost"],
            ["bg-pos", "Contribution"],
          ].map(([cls, l]) => (
            <span key={l} className="inline-flex items-center gap-1.5">
              <span className={clsx("h-2 w-2 rounded-full", cls)} /> {l}
            </span>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader
          title="Allocation vs consumption vs returns"
          description="Stock leaves the warehouse for a project when it is dispatched. It becomes a cost only when consumed — the gap is real material sitting at site."
          actions={
            withMaterial.length > 0 && (
              <select
                value={materialProject}
                onChange={(e) => setMaterialProject(e.target.value)}
                className="field !w-auto !py-1.5 text-[12.5px]"
                aria-label="Filter by project"
              >
                <option value="all">All projects</option>
                {withMaterial.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} · {p.name}
                  </option>
                ))}
              </select>
            )
          }
        />
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Project</th>
                  <th className="th">Material</th>
                  <th className="th text-right">Allocated</th>
                  <th className="th text-right">Consumed</th>
                  <th className="th text-right">Returned</th>
                  <th className="th text-right">Balance at site</th>
                  <th className="th text-right">Balance value</th>
                </tr>
              </thead>
              <tbody>
                {materialRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-[13px] text-ink-400">
                      No material has been dispatched to site yet.
                    </td>
                  </tr>
                )}
                {materialRows.map((m) => (
                  <tr key={m.projectId + m.productId} className="hover:bg-paper-100/80">
                    <td className="td">
                      <Link href={`/projects/${m.projectId}`} className="link font-mono text-[12px]">
                        {m.projectCode}
                      </Link>
                    </td>
                    <td className="td">
                      <div className="font-medium text-ink-900">{m.name}</div>
                      <div className="font-mono text-[11px] text-ink-400">{m.sku}</div>
                    </td>
                    <td className="tdn">{qty(m.allocated, m.unit)}</td>
                    <td className="tdn">{qty(m.consumed, m.unit)}</td>
                    <td className="tdn text-ink-500">{m.returned ? qty(m.returned, m.unit) : "—"}</td>
                    <td className="tdn font-medium">{m.balance ? qty(m.balance, m.unit) : "—"}</td>
                    <td className="tdn font-semibold">{m.balanceValue ? inr(m.balanceValue) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <ProjectFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(id) => {
          setCreating(false);
          if (id) router.push(`/projects/${id}`);
          else load();
        }}
      />
    </div>
  );
}
