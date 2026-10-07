"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { clsx } from "clsx";
import { ArrowLeft, ArrowUpRight, Pencil, Plus, Receipt } from "lucide-react";
import { SectionHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormInput, FormSelect } from "@/components/ui/form-field";
import { Chip, Meter, StatusBadge } from "@/components/ui/status-badge";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { usePermission } from "@/hooks/use-permission";
import { apiFetch, apiPost } from "@/hooks/use-api";
import { inr, inrShort, qty, shortDate } from "@/lib/format";
import type { MaterialRow, ProjectEconomics } from "@/server/services/project-economics";
import { ProjectFormModal, type ProjectInput } from "../project-form";

interface Overview {
  project: ProjectInput & {
    _id: string;
    projectId: string;
    name: string;
    status: string;
    progress: number;
    customer?: { _id: string; companyName: string; contactPerson?: string; city?: string };
    projectManager?: { _id: string; name: string };
    projectEngineer?: { _id: string; name: string };
  };
  economics: ProjectEconomics;
  materials: MaterialRow[];
  boq: {
    _id: string;
    itemNo: string;
    section?: string;
    description: string;
    unit: string;
    quantity: number;
    supplyRate: number;
    installRate: number;
  }[];
  costs: { _id: string; date: string; type: string; description: string; amount: number }[];
  transactions: {
    _id: string;
    type: string;
    quantity: number;
    createdAt: string;
    notes?: string;
    product?: { sku: string; name: string; unit: string; purchasePrice?: number };
    createdBy?: { name: string };
  }[];
  sites: { _id: string; siteId: string; name: string; city?: string; status: string }[];
  tasks: { _id: string; title: string; status: string; priority: string; dueDate?: string }[];
}

const MOVE_LABEL: Record<string, { label: string; tone: "blue" | "green" | "amber" }> = {
  site_issue: { label: "Dispatch to site", tone: "blue" },
  consumed: { label: "Consumed at site", tone: "green" },
  site_return: { label: "Returned to store", tone: "amber" },
};

const COST_TONE: Record<string, "amber" | "violet" | "slate" | "blue"> = {
  labour: "amber",
  transport: "violet",
  overhead: "slate",
  other: "blue",
};

function Signed({ v, invert }: { v: number; invert?: boolean }) {
  const bad = invert ? v < 0 : v > 0;
  return (
    <span className={clsx("tnum", bad ? "text-neg" : "text-pos")}>
      {v > 0 ? "+" : v < 0 ? "−" : ""}
      {inrShort(Math.abs(v)).replace("−", "")}
    </span>
  );
}

function PnlRow({ label, value, minus, strong }: { label: string; value: number; minus?: boolean; strong?: boolean }) {
  return (
    <div className={clsx("flex items-baseline justify-between gap-4 py-3", strong && "pt-4")}>
      <span className={clsx("text-[13.5px]", strong ? "font-semibold text-ink-900" : "text-ink-600")}>{label}</span>
      <span
        className={clsx(
          "tnum",
          strong ? "font-serif text-[28px] leading-none" : "text-[14px] font-medium text-ink-900",
          strong && (value >= 0 ? "text-pos" : "text-neg")
        )}
      >
        {minus && value > 0 ? "(" : ""}
        {inr(value)}
        {minus && value > 0 ? ")" : ""}
      </span>
    </div>
  );
}

function CostModal({ open, projectId, onClose, onSaved }: { open: boolean; projectId: string; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ type: "labour", description: "", amount: "", date: today });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError("");
    const res = await apiPost(`/api/projects/${projectId}/costs`, { ...form, amount: Number(form.amount) });
    setSaving(false);
    if (res.success === false) return setError(res.error?.message ?? "Could not save");
    setForm({ type: "labour", description: "", amount: "", date: today });
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Record a cost">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormSelect label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="labour">Labour</option>
          <option value="transport">Transport</option>
          <option value="overhead">Overhead</option>
          <option value="other">Other</option>
        </FormSelect>
        <FormInput label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <FormInput
          label="Description"
          required
          className="sm:col-span-2"
          placeholder="e.g. Fabrication gang — week 32"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <FormInput
          label="Amount (₹)"
          required
          type="number"
          min={0}
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
      </div>
      {error && <p className="mt-3 text-[13px] text-neg">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Record cost"}
        </Button>
      </div>
    </Modal>
  );
}

function BoqModal({ open, projectId, onClose, onSaved }: { open: boolean; projectId: string; onClose: () => void; onSaved: () => void }) {
  const empty = { itemNo: "", section: "", description: "", unit: "Nos", quantity: "", supplyRate: "", installRate: "" };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    setSaving(true);
    setError("");
    const res = await apiPost(`/api/projects/${projectId}/boq`, form);
    setSaving(false);
    if (res.success === false) return setError(res.error?.message ?? "Could not save");
    setForm(empty);
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add BOQ line" maxWidth="max-w-2xl">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <FormInput label="Item no" required value={form.itemNo} onChange={set("itemNo")} placeholder="1.1" />
        <FormInput label="Section" value={form.section} onChange={set("section")} placeholder="Hydrant" className="sm:col-span-3" />
        <FormInput label="Description" required value={form.description} onChange={set("description")} className="col-span-2 sm:col-span-4" />
        <FormInput label="Unit" required value={form.unit} onChange={set("unit")} />
        <FormInput label="Quantity" required type="number" min={0} value={form.quantity} onChange={set("quantity")} />
        <FormInput label="Supply rate (₹)" required type="number" min={0} value={form.supplyRate} onChange={set("supplyRate")} />
        <FormInput label="Install rate (₹)" type="number" min={0} value={form.installRate} onChange={set("installRate")} />
      </div>
      {error && <p className="mt-3 text-[13px] text-neg">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Add line"}
        </Button>
      </div>
    </Modal>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const canEdit = usePermission("project.edit");
  const [d, setD] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"edit" | "cost" | "boq" | null>(null);

  const load = useCallback(() => {
    apiFetch(`/api/projects/${id}/overview`).then((j) =>
      j.success ? setD(j.data) : setError(j.error?.code === "NOT_FOUND" ? "notfound" : j.error?.message ?? "Could not load")
    );
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const boqSections = useMemo(() => {
    const map = new Map<string, Overview["boq"]>();
    for (const b of d?.boq ?? []) {
      const k = b.section || "General";
      map.set(k, [...(map.get(k) ?? []), b]);
    }
    return [...map.entries()];
  }, [d]);

  if (error === "notfound")
    return (
      <div className="card">
        <EmptyState
          title="Project not found"
          description="It may have been removed."
          action={
            <Link href="/projects" className="btn-ghost">
              Back to projects
            </Link>
          }
        />
      </div>
    );
  if (error) return <div className="card-pad text-[13px] text-neg">{error}</div>;
  if (!d) return <LoadingState />;

  const { project: p, economics: e } = d;
  const closeAndReload = () => {
    setModal(null);
    load();
  };
  const boqTotal = e.boq.supply + e.boq.install;
  const matVarPct = e.boq.materialEarned ? (e.boq.materialVariance ?? 0) / e.boq.materialEarned : 0;
  const labVarPct = e.boq.labourEarned ? (e.boq.labourVariance ?? 0) / e.boq.labourEarned : 0;

  return (
    <div className="space-y-10">
      <div>
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-500 hover:text-ink-900">
          <ArrowLeft className="h-3.5 w-3.5" /> All projects
        </Link>
        <div className="mt-3 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div className="min-w-0">
            <div className="kicker">
              <span className="font-mono normal-case tracking-normal">{p.projectId}</span>
              {p.customer && ` · ${p.customer.companyName}`}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <h1 className="font-serif text-[32px] sm:text-[40px] leading-[1.08] tracking-tight text-ink-900">{p.name}</h1>
              <StatusBadge status={p.status} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-500">
              {p.location && <span>{p.location}</span>}
              {p.projectType && <span>{p.projectType}</span>}
              {p.projectManager && <span>PM · {p.projectManager.name}</span>}
              {p.projectEngineer && <span>Engineer · {p.projectEngineer.name}</span>}
              {p.expectedCompletionDate && <span>Due {shortDate(p.expectedCompletionDate)}</span>}
            </div>
          </div>
          {canEdit && (
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button variant="secondary" onClick={() => setModal("cost")}>
                <Receipt className="h-4 w-4" /> Record cost
              </Button>
              <Button onClick={() => setModal("edit")}>
                <Pencil className="h-4 w-4" /> Edit project
              </Button>
            </div>
          )}
        </div>
        <div className="mt-5 card-pad flex items-center gap-4">
          <span className="label shrink-0">Completion</span>
          <Meter pct={e.progress} tone={e.progress >= 100 ? "pos" : "brand"} />
          <span className="tnum font-serif text-[22px] leading-none text-ink-900 w-14 text-right">{e.progress}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="lg:col-span-2">
          <SectionHeader
            title="Live profit & loss"
            description="Revenue recognised at today's completion, less cost actually incurred."
          />
          <div className="card px-5 divide-y divide-paper-200">
            <PnlRow label="Revenue earned to date" value={e.earned} />
            <PnlRow label="Less: material consumed" value={e.materialConsumed} minus />
            <PnlRow label="Less: labour" value={e.labour} minus />
            <PnlRow label="Less: other costs" value={e.other} minus />
            <div className="pb-4">
              <PnlRow label="Live contribution" value={e.contribution} strong />
              <div className="text-right text-[12px] text-ink-500 -mt-1">
                {e.margin != null ? `${(e.margin * 100).toFixed(1)}% margin on earned revenue` : "No revenue earned yet"}
              </div>
            </div>
          </div>
        </section>

        <section className="lg:col-span-3">
          <SectionHeader title="BOQ vs actual" description="Spend measured against the tender allowance earned so far." />
          {e.boq.lines === 0 ? (
            <div className="card">
              <EmptyState
                title="No BOQ yet"
                description="Add the bill of quantities to compare material and labour against the tender."
                action={canEdit && <Button onClick={() => setModal("boq")}>Add BOQ line</Button>}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <KpiCard
                title="BOQ material allowance"
                value={inrShort(e.boq.supply)}
                subtitle={`${inrShort(e.boq.materialEarned)} earned at ${e.progress}%`}
              />
              <KpiCard
                title="Actual material consumed"
                value={inrShort(e.materialConsumed)}
                subtitle={`against ${inrShort(e.boq.materialEarned)} allowance earned`}
              />
              <div className="card-pad">
                <div className="label">Material variance</div>
                <div className="mt-2 font-serif text-[30px] leading-none">
                  {e.boq.materialVariance == null ? "—" : <Signed v={e.boq.materialVariance} />}
                </div>
                <div className="mt-2 text-[12px] text-ink-500">
                  {e.boq.materialVariance == null
                    ? "Shown once work is earned"
                    : `${matVarPct > 0 ? "+" : ""}${(matVarPct * 100).toFixed(1)}% vs earned allowance · ${matVarPct > 0 ? "over" : "within"} BOQ`}
                </div>
              </div>
              <div className="card-pad">
                <div className="label">Labour vs BOQ allowance</div>
                <div className="mt-2 font-serif text-[30px] leading-none tnum text-ink-900">{inrShort(e.labour)}</div>
                <div className="mt-2 text-[12px] text-ink-500">
                  {inrShort(e.boq.labourEarned)} earned of {inrShort(e.boq.install)} total
                  {e.boq.labourVariance != null && (
                    <>
                      {" · "}
                      <span className={labVarPct > 0 ? "text-neg" : "text-pos"}>
                        {labVarPct > 0 ? "+" : "−"}
                        {Math.abs(labVarPct * 100).toFixed(1)}%
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <section>
        <SectionHeader
          title="Material position"
          description="Allocated is what left the warehouse for this project. Consumed is what was used. The balance is stock physically at site today."
          actions={
            <Link href="/inventory/stock-movements" className="link text-[12.5px] inline-flex items-center gap-1">
              Stock ledger <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Material</th>
                  <th className="th text-right">Rate</th>
                  <th className="th text-right">Allocated</th>
                  <th className="th text-right">Consumed</th>
                  <th className="th text-right">Returned</th>
                  <th className="th text-right">Balance at site</th>
                  <th className="th text-right">Balance value</th>
                </tr>
              </thead>
              <tbody>
                {d.materials.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-[13px] text-ink-400">
                      Nothing dispatched to this project yet.
                    </td>
                  </tr>
                )}
                {d.materials.map((m) => (
                  <tr key={m.productId} className="hover:bg-paper-100/80">
                    <td className="td">
                      <div className="font-medium text-ink-900">{m.name}</div>
                      <div className="text-[11px] text-ink-400">
                        <span className="font-mono">{m.sku}</span>
                        {m.category && ` · ${m.category}`}
                      </div>
                    </td>
                    <td className="tdn text-ink-500">{inr(m.rate)}</td>
                    <td className="tdn">{qty(m.allocated, m.unit)}</td>
                    <td className="tdn">{qty(m.consumed, m.unit)}</td>
                    <td className="tdn text-ink-500">{m.returned ? qty(m.returned, m.unit) : "—"}</td>
                    <td className="tdn font-medium">{m.balance ? qty(m.balance, m.unit) : "—"}</td>
                    <td className="tdn font-semibold">{m.balanceValue ? inr(m.balanceValue) : "—"}</td>
                  </tr>
                ))}
              </tbody>
              {d.materials.length > 0 && (
                <tfoot>
                  <tr>
                    <td className="td font-semibold" colSpan={2}>
                      Total
                    </td>
                    <td className="tdn font-semibold">{inr(e.materialAllocated)}</td>
                    <td className="tdn font-semibold">{inr(e.materialConsumed)}</td>
                    <td className="tdn font-semibold">{inr(e.materialReturned)}</td>
                    <td className="tdn" />
                    <td className="tdn font-semibold">{inr(e.atSite)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader
          title="BOQ — bill of quantities"
          description={
            e.boq.lines
              ? `${e.boq.lines} line items across ${boqSections.length} section${boqSections.length === 1 ? "" : "s"} · total BOQ value ${inr(boqTotal)}`
              : "No BOQ lines yet."
          }
          actions={
            canEdit && (
              <Button variant="secondary" size="sm" onClick={() => setModal("boq")}>
                <Plus className="h-3.5 w-3.5" /> Add line
              </Button>
            )
          }
        />
        {e.boq.lines > 0 && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">Item</th>
                    <th className="th">Description</th>
                    <th className="th">Unit</th>
                    <th className="th text-right">Qty</th>
                    <th className="th text-right">Supply rate</th>
                    <th className="th text-right">Install rate</th>
                    <th className="th text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {boqSections.map(([section, lines]) => (
                    <SectionRows key={section} section={section} lines={lines} />
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="td font-semibold" colSpan={6}>
                      Total BOQ value
                    </td>
                    <td className="tdn font-semibold">{inr(boqTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <SectionHeader
            title="Cost entries"
            description="Labour, transport and overhead booked against this project."
            actions={
              canEdit && (
                <Button variant="secondary" size="sm" onClick={() => setModal("cost")}>
                  <Plus className="h-3.5 w-3.5" /> Record
                </Button>
              )
            }
          />
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">Date</th>
                    <th className="th">Type</th>
                    <th className="th">Description</th>
                    <th className="th text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {d.costs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-[13px] text-ink-400">
                        No costs booked yet.
                      </td>
                    </tr>
                  )}
                  {d.costs.map((c) => (
                    <tr key={c._id} className="hover:bg-paper-100/80">
                      <td className="td whitespace-nowrap tnum text-ink-500">{shortDate(c.date)}</td>
                      <td className="td">
                        <Chip tone={COST_TONE[c.type] ?? "slate"}>{c.type}</Chip>
                      </td>
                      <td className="td">{c.description}</td>
                      <td className="tdn font-medium">{inr(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section>
          <SectionHeader
            title="Recent movements"
            description="Latest stock movements recorded against this project."
            actions={
              <Link href="/inventory/stock-movements" className="link text-[12.5px] inline-flex items-center gap-1">
                Full ledger <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">Date</th>
                    <th className="th">Movement</th>
                    <th className="th">Material</th>
                    <th className="th text-right">Qty</th>
                    <th className="th text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {d.transactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-[13px] text-ink-400">
                        No movements yet.
                      </td>
                    </tr>
                  )}
                  {d.transactions.map((t) => {
                    const m = MOVE_LABEL[t.type];
                    return (
                      <tr key={t._id} className="hover:bg-paper-100/80">
                        <td className="td whitespace-nowrap tnum text-ink-500">{shortDate(t.createdAt)}</td>
                        <td className="td">{m ? <Chip tone={m.tone}>{m.label}</Chip> : t.type}</td>
                        <td className="td">
                          <div className="font-mono text-[11.5px] text-ink-700">{t.product?.sku}</div>
                          <div className="text-[11.5px] text-ink-500 truncate max-w-[220px]">{t.product?.name}</div>
                        </td>
                        <td className="tdn">{qty(t.quantity, t.product?.unit)}</td>
                        <td className="tdn">{inr(t.quantity * (t.product?.purchasePrice ?? 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <SectionHeader
            title="Sites"
            description="Buildings and locations under this project."
            actions={
              <Link href="/sites" className="link text-[12.5px] inline-flex items-center gap-1">
                All sites <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="card divide-y divide-paper-200">
            {d.sites.length === 0 && <div className="px-5 py-8 text-[13px] text-ink-400">No sites linked.</div>}
            {d.sites.map((s) => (
              <div key={s._id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="text-[13.5px] font-medium text-ink-900 truncate">{s.name}</div>
                  <div className="text-[11.5px] text-ink-400">
                    <span className="font-mono">{s.siteId}</span>
                    {s.city && ` · ${s.city}`}
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
        </section>
        <section>
          <SectionHeader
            title="Open tasks"
            description="Work still to do on this project."
            actions={
              <Link href="/tasks" className="link text-[12.5px] inline-flex items-center gap-1">
                All tasks <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="card divide-y divide-paper-200">
            {d.tasks.length === 0 && <div className="px-5 py-8 text-[13px] text-ink-400">No open tasks.</div>}
            {d.tasks.map((t) => {
              const overdue = t.dueDate && new Date(t.dueDate) < new Date();
              return (
                <div key={t._id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-medium text-ink-900 truncate">{t.title}</div>
                    {t.dueDate && (
                      <div className={clsx("text-[11.5px]", overdue ? "text-neg" : "text-ink-400")}>
                        {overdue ? "Overdue · was due " : "Due "}
                        {shortDate(t.dueDate)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <StatusBadge status={t.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <ProjectFormModal open={modal === "edit"} project={p} onClose={() => setModal(null)} onSaved={closeAndReload} />
      <CostModal open={modal === "cost"} projectId={id} onClose={() => setModal(null)} onSaved={closeAndReload} />
      <BoqModal open={modal === "boq"} projectId={id} onClose={() => setModal(null)} onSaved={closeAndReload} />
    </div>
  );
}

function SectionRows({ section, lines }: { section: string; lines: Overview["boq"] }) {
  const subtotal = lines.reduce((s, b) => s + b.quantity * (b.supplyRate + b.installRate), 0);
  return (
    <>
      <tr>
        <td colSpan={6} className="px-3.5 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
          {section}
        </td>
        <td className="px-3.5 pt-4 pb-1.5 text-right tnum text-[11.5px] text-ink-500">{inr(subtotal)}</td>
      </tr>
      {lines.map((b) => (
        <tr key={b._id} className="hover:bg-paper-100/80">
          <td className="td font-mono text-[12px] text-ink-500">{b.itemNo}</td>
          <td className="td max-w-[420px]">{b.description}</td>
          <td className="td text-ink-500">{b.unit}</td>
          <td className="tdn">{qty(b.quantity)}</td>
          <td className="tdn">{inr(b.supplyRate)}</td>
          <td className="tdn">{inr(b.installRate)}</td>
          <td className="tdn font-medium">{inr(b.quantity * (b.supplyRate + b.installRate))}</td>
        </tr>
      ))}
    </>
  );
}
