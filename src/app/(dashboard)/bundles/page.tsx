"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Plus, Send, Trash2 } from "lucide-react";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-field";
import { StatusBadge, Chip } from "@/components/ui/status-badge";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch, apiPost } from "@/hooks/use-api";
import { usePermission } from "@/hooks/use-permission";
import { inr, inrShort, qty, shortDate } from "@/lib/format";

interface Sku {
  _id: string;
  sku: string;
  name: string;
  unit: string;
  purchasePrice?: number;
}

interface BundleTypeRow {
  _id: string;
  code: string;
  name: string;
  description?: string;
  components: { product: Sku; quantity: number; rate: number; warehouseStock: number }[];
  costPerUnit: number;
}

interface Instance {
  _id: string;
  number: string;
  units: number;
  status: string;
  dispatchedAt: string;
  closedAt?: string;
  bundleType?: { code: string; name: string };
  project?: { _id: string; projectId: string; name: string };
  warehouse?: { name: string };
  components: { product: Sku; quantity: number; rate: number; consumed: number; returned: number }[];
}

function Split({ c }: { c: Instance["components"][number] }) {
  const open = c.quantity - c.consumed - c.returned;
  const w = (n: number) => `${(n / c.quantity) * 100}%`;
  return (
    <div className="flex h-1.5 w-24 overflow-hidden rounded-full bg-paper-200" title={`consumed ${c.consumed} · returned ${c.returned} · open ${open}`}>
      <div className="bg-brand-500" style={{ width: w(c.consumed) }} />
      <div className="bg-amber-500" style={{ width: w(c.returned) }} />
    </div>
  );
}

function TypeModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ code: "", name: "", description: "" });
  const [comps, setComps] = useState([{ product: "", quantity: "" }]);
  const [products, setProducts] = useState<Sku[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) apiFetch("/api/products?limit=100&sort=sku").then((j) => j.success && setProducts(j.data));
  }, [open]);

  async function save() {
    setSaving(true);
    setError("");
    const res = await apiPost("/api/bundles", { ...form, components: comps.filter((c) => c.product).map((c) => ({ product: c.product, quantity: Number(c.quantity) })) });
    setSaving(false);
    if (res.success === false) return setError(res.error?.message ?? "Could not save");
    setForm({ code: "", name: "", description: "" });
    setComps([{ product: "", quantity: "" }]);
    onSaved();
  }

  const cost = comps.reduce((s, c) => s + (Number(c.quantity) || 0) * (products.find((p) => p._id === c.product)?.purchasePrice ?? 0), 0);

  return (
    <Modal open={open} onClose={onClose} title="Define a bundle" maxWidth="max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormInput label="Code" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="BH-001" />
        <FormInput label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="sm:col-span-2" placeholder="Fire Hydrant Landing Assembly" />
        <FormTextarea label="What goes in it" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="sm:col-span-3" />
      </div>
      <div className="mt-4 label mb-1.5">Components per bundle</div>
      <div className="space-y-2">
        {comps.map((c, i) => (
          <div key={i} className="flex gap-2">
            <select
              aria-label={`Component ${i + 1}`}
              className="field flex-1"
              value={c.product}
              onChange={(e) => setComps(comps.map((x, j) => (j === i ? { ...x, product: e.target.value } : x)))}
            >
              <option value="">Select SKU</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.sku} · {p.name}
                </option>
              ))}
            </select>
            <input
              aria-label={`Component ${i + 1} quantity`}
              type="number"
              min={0}
              className="field !w-28 text-right"
              placeholder="Qty"
              value={c.quantity}
              onChange={(e) => setComps(comps.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))}
            />
            <button
              type="button"
              aria-label={`Remove component ${i + 1}`}
              disabled={comps.length === 1}
              onClick={() => setComps(comps.filter((_, j) => j !== i))}
              className="px-2 text-ink-400 hover:text-neg disabled:opacity-30"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <button type="button" onClick={() => setComps([...comps, { product: "", quantity: "" }])} className="btn-ghost !py-1 !px-2.5 !text-[12px]">
          <Plus className="h-3.5 w-3.5" /> Add component
        </button>
        <span className="text-[13px] tnum text-ink-600">
          Cost to assemble one: <span className="font-semibold text-ink-900">{inr(cost)}</span>
        </span>
      </div>
      {error && <p className="mt-3 text-[13px] text-neg">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save bundle"}
        </Button>
      </div>
    </Modal>
  );
}

function DispatchModal({ type, onClose, onSaved }: { type: BundleTypeRow | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ units: "1", warehouse: "", project: "" });
  const [warehouses, setWarehouses] = useState<{ _id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ _id: string; projectId: string; name: string; status: string }[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!type) return;
    apiFetch("/api/warehouses?limit=100&sort=name").then((j) => j.success && setWarehouses(j.data));
    apiFetch("/api/projects?limit=100&sort=projectId").then((j) => j.success && setProjects(j.data));
  }, [type]);

  async function save() {
    if (!type) return;
    setSaving(true);
    setError("");
    const res = await apiPost("/api/bundles/dispatch", { bundleType: type._id, units: Number(form.units), warehouse: form.warehouse, project: form.project });
    setSaving(false);
    if (res.success === false) return setError(res.error?.message ?? "Could not dispatch");
    setForm({ units: "1", warehouse: "", project: "" });
    onSaved();
  }

  const units = Number(form.units) || 0;

  return (
    <Modal open={!!type} onClose={onClose} title={type ? `Dispatch ${type.code}` : "Dispatch"} maxWidth="max-w-xl">
      {type && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormInput label="Bundles" required type="number" min={1} step={1} value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} />
            <FormSelect label="From warehouse" required value={form.warehouse} onChange={(e) => setForm({ ...form, warehouse: e.target.value })} className="sm:col-span-2">
              <option value="">Select warehouse</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.name}
                </option>
              ))}
            </FormSelect>
            <FormSelect label="To project" required value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} className="sm:col-span-3">
              <option value="">Select project</option>
              {projects
                .filter((p) => !["completed", "cancelled"].includes(p.status))
                .map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.projectId} · {p.name}
                  </option>
                ))}
            </FormSelect>
          </div>
          <div className="mt-4 border border-paper-200">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Component</th>
                  <th className="th text-right">Issued</th>
                  <th className="th text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {type.components.map((c) => (
                  <tr key={c.product._id}>
                    <td className="td">
                      <span className="font-mono text-[11.5px]">{c.product.sku}</span> <span className="text-[12px] text-ink-500">{c.product.name}</span>
                    </td>
                    <td className="tdn">{qty(c.quantity * units, c.product.unit)}</td>
                    <td className="tdn">{inr(c.quantity * units * c.rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12px] text-ink-500">Each component is posted to the stock ledger as a separate dispatch to site, at its own rate.</p>
          {error && <p className="mt-3 text-[13px] text-neg">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Dispatching…" : `Dispatch · ${inr(type.costPerUnit * units)}`}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

function SettleModal({ inst, onClose, onSaved }: { inst: Instance | null; onClose: () => void; onSaved: () => void }) {
  const [vals, setVals] = useState<Record<string, { consumed: string; returned: string }>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!inst) return;
    setSaving(true);
    setError("");
    const res = await apiPost(`/api/bundles/${inst._id}/settle`, {
      lines: Object.entries(vals).map(([product, v]) => ({ product, consumed: Number(v.consumed) || 0, returned: Number(v.returned) || 0 })),
    });
    setSaving(false);
    if (res.success === false) return setError(res.error?.message ?? "Could not settle");
    setVals({});
    onSaved();
  }

  return (
    <Modal open={!!inst} onClose={onClose} title={inst ? `Settle ${inst.number}` : "Settle"} maxWidth="max-w-2xl">
      {inst && (
        <>
          <p className="text-[13px] text-ink-600">Book what was installed and what came back to the store. Anything left stays open at site.</p>
          <div className="mt-4 border border-paper-200 overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr>
                  <th className="th">Component</th>
                  <th className="th text-right">Open</th>
                  <th className="th w-28 text-right">Consumed</th>
                  <th className="th w-28 text-right">Returned</th>
                </tr>
              </thead>
              <tbody>
                {inst.components.map((c) => {
                  const open = c.quantity - c.consumed - c.returned;
                  const v = vals[c.product._id] ?? { consumed: "", returned: "" };
                  const set = (k: "consumed" | "returned", x: string) => setVals({ ...vals, [c.product._id]: { ...v, [k]: x } });
                  return (
                    <tr key={c.product._id}>
                      <td className="td">
                        <div className="font-mono text-[11.5px]">{c.product.sku}</div>
                        <div className="text-[12px] text-ink-500">{c.product.name}</div>
                      </td>
                      <td className="tdn">{qty(open, c.product.unit)}</td>
                      <td className="px-2 py-1.5">
                        <input
                          aria-label={`${c.product.sku} consumed`}
                          type="number"
                          min={0}
                          max={open}
                          disabled={open <= 0}
                          className="field !py-1.5 text-right"
                          value={v.consumed}
                          onChange={(e) => set("consumed", e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          aria-label={`${c.product.sku} returned`}
                          type="number"
                          min={0}
                          max={open}
                          disabled={open <= 0}
                          className="field !py-1.5 text-right"
                          value={v.returned}
                          onChange={(e) => set("returned", e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {error && <p className="mt-3 text-[13px] text-neg">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Posting…" : "Post to ledger"}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

export default function BundlesPage() {
  const canDefine = usePermission("product.create");
  const canIssue = usePermission("inventory.issue");
  const [data, setData] = useState<{ types: BundleTypeRow[]; instances: Instance[] } | null>(null);
  const [defining, setDefining] = useState(false);
  const [dispatching, setDispatching] = useState<BundleTypeRow | null>(null);
  const [settling, setSettling] = useState<Instance | null>(null);

  const load = useCallback(() => {
    apiFetch("/api/bundles").then((j) => j.success && setData(j.data));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  if (!data) return <LoadingState />;

  const { types, instances } = data;
  const lines = types.reduce((s, t) => s + t.components.length, 0);
  const atSite = instances.filter((i) => i.status === "at_site");
  const openValue = atSite.reduce((s, i) => s + i.components.reduce((a, c) => a + (c.quantity - c.consumed - c.returned) * c.rate, 0), 0);
  const returnedValue = instances.reduce((s, i) => s + i.components.reduce((a, c) => a + c.returned * c.rate, 0), 0);
  const done = (fn: () => void) => () => {
    fn();
    load();
  };

  return (
    <div className="space-y-10">
      <PageHeader
        kicker="Composite units"
        title="Bundles, without losing the parts"
        description="Several SKUs packed as one dispatch unit for site. Component cost and quantity stay traceable — including partial returns."
        actions={
          canDefine && (
            <Button onClick={() => setDefining(true)}>
              <Plus className="h-4 w-4" /> Define bundle
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Bundle types" value={types.length} subtitle={`${lines} component lines defined`} />
        <KpiCard title="Bundles dispatched" value={instances.length} subtitle={`${atSite.length} currently at site`} />
        <KpiCard title="Value still open" value={inrShort(openValue)} tone={openValue > 0 ? "warn" : "default"} subtitle="dispatched, not yet consumed or returned" />
        <KpiCard title="Returned to warehouse" value={inrShort(returnedValue)} subtitle="components not needed at site" />
      </div>

      <div className="card-pad border-l-4 !border-l-ink-900 text-[13px] leading-relaxed text-ink-600">
        <span className="font-semibold text-ink-900">What a bundle is.</span> A fire hydrant landing assembly is really a pipe, a
        valve, flanges and gaskets — issued and tracked as one unit instead of four lines on a dispatch slip. Dispatching a bundle
        posts each component to the stock ledger separately, at its own rate, so every rupee inside it still traces back to the
        supplier bill it came from.
      </div>

      <section>
        <SectionHeader title="Bundle definitions" description="What each bundle is made of, and what the warehouses currently hold of each component." />
        {types.length === 0 ? (
          <div className="card">
            <EmptyState title="No bundles defined" description="Define a bundle to dispatch several SKUs to site as one unit." />
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {types.map((t) => {
              const canMake = Math.min(...t.components.map((c) => Math.floor(c.warehouseStock / c.quantity)));
              return (
                <div key={t._id} className="card flex flex-col">
                  <div className="px-5 pt-5 pb-4 border-b border-paper-200 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-[11px] text-ink-400">{t.code}</div>
                      <h3 className="font-serif text-[22px] leading-tight text-ink-900">{t.name}</h3>
                      {t.description && <p className="mt-1 text-[12.5px] text-ink-500">{t.description}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="label">Cost to assemble one</div>
                      <div className="font-serif text-[24px] tnum text-ink-900">{inr(t.costPerUnit)}</div>
                      <div className="text-[11px] text-ink-400">at latest rates</div>
                    </div>
                  </div>
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="th">Component</th>
                          <th className="th text-right">Per bundle</th>
                          <th className="th text-right">Rate</th>
                          <th className="th text-right">In stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.components.map((c) => (
                          <tr key={c.product._id}>
                            <td className="td">
                              <div className="font-mono text-[11.5px] text-ink-700">{c.product.sku}</div>
                              <div className="text-[12px] text-ink-500">{c.product.name}</div>
                            </td>
                            <td className="tdn">{qty(c.quantity, c.product.unit)}</td>
                            <td className="tdn">{inr(c.rate)}</td>
                            <td className={clsx("tdn", c.warehouseStock < c.quantity && "text-neg font-semibold")}>{qty(c.warehouseStock, c.product.unit)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-5 py-3 border-t border-paper-200 flex items-center justify-between gap-3">
                    <span className="text-[12px] text-ink-500">
                      Enough stock for <span className="font-semibold text-ink-900 tnum">{Math.max(0, canMake)}</span> across all warehouses
                    </span>
                    {canIssue && (
                      <Button size="sm" onClick={() => setDispatching(t)} disabled={canMake < 1}>
                        <Send className="h-3.5 w-3.5" /> Dispatch
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Dispatched bundles" description="Every bundle sent to site, with each component's consumed / returned / open split." />
        {instances.length === 0 ? (
          <div className="card">
            <EmptyState title="Nothing dispatched yet" description="Dispatch a bundle from a definition above." />
          </div>
        ) : (
          <div className="space-y-4">
            {instances.map((i) => {
              const cost = i.components.reduce((s, c) => s + c.quantity * c.rate, 0);
              return (
                <div key={i._id} className="card">
                  <div className="px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-paper-200">
                    <div>
                      <span className="font-mono text-[13px] font-semibold text-ink-900">{i.number}</span>
                      <span className="ml-2 text-[12px] text-ink-500">
                        {i.units} × {i.bundleType?.code} · {i.bundleType?.name}
                      </span>
                    </div>
                    <StatusBadge status={i.status === "at_site" ? "in_progress" : "closed"} />
                    <span className="text-[12px] text-ink-500">From {i.warehouse?.name}</span>
                    {i.project && (
                      <Link href={`/projects/${i.project._id}`} className="link text-[12px]">
                        {i.project.projectId} · {i.project.name}
                      </Link>
                    )}
                    <span className="text-[12px] text-ink-500">{shortDate(i.dispatchedAt)}</span>
                    <span className="ml-auto tnum text-[13px] font-semibold text-ink-900">{inr(cost)}</span>
                    {i.status === "at_site" && canIssue && (
                      <Button size="sm" variant="secondary" onClick={() => setSettling(i)}>
                        Settle
                      </Button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="th">Component</th>
                          <th className="th text-right">Qty</th>
                          <th className="th text-right">Consumed</th>
                          <th className="th text-right">Returned</th>
                          <th className="th text-right">Open</th>
                          <th className="th">Split</th>
                        </tr>
                      </thead>
                      <tbody>
                        {i.components.map((c) => {
                          const open = c.quantity - c.consumed - c.returned;
                          return (
                            <tr key={c.product._id}>
                              <td className="td">
                                <span className="font-mono text-[11.5px] text-ink-700">{c.product.sku}</span>{" "}
                                <span className="text-[12px] text-ink-500">{c.product.name}</span>
                              </td>
                              <td className="tdn">{qty(c.quantity, c.product.unit)}</td>
                              <td className="tdn">{qty(c.consumed, c.product.unit)}</td>
                              <td className="tdn">{qty(c.returned, c.product.unit)}</td>
                              <td className={clsx("tdn", open > 0 ? "text-warn font-semibold" : "text-ink-400")}>{qty(open, c.product.unit)}</td>
                              <td className="td">
                                <Split c={c} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
            <div className="flex gap-4 text-[11px] text-ink-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brand-500" /> Consumed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Returned
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-paper-300" /> Open at site
              </span>
              <Chip tone="slate" className="!text-[10px]">
                every split is a ledger entry
              </Chip>
            </div>
          </div>
        )}
      </section>

      <TypeModal open={defining} onClose={() => setDefining(false)} onSaved={done(() => setDefining(false))} />
      <DispatchModal type={dispatching} onClose={() => setDispatching(null)} onSaved={done(() => setDispatching(null))} />
      <SettleModal inst={settling} onClose={() => setSettling(null)} onSaved={done(() => setSettling(null))} />
    </div>
  );
}
