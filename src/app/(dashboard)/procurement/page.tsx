"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import { ArrowUpRight, Plus } from "lucide-react";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-field";
import { Meter, StatusBadge, Chip } from "@/components/ui/status-badge";
import { LineEditor, blankLine, type LineDraft, type SkuOption } from "@/components/procurement/line-editor";
import { LowStockAlertBell } from "@/components/inventory/low-stock-alert-bell";
import { useFetch, apiFetch, apiPost, apiPatch } from "@/hooks/use-api";
import { usePermission } from "@/hooks/use-permission";
import { inr, inrShort, qty, shortDate } from "@/lib/format";

interface PoRow {
  _id: string;
  poNumber: string;
  vendor?: { vendorName: string };
  project?: { _id: string; projectId: string; name: string };
  date: string;
  expectedDate?: string;
  status: string;
  lines: { _id: string; product?: { sku: string; name: string; unit: string }; quantity: number; rate: number; receivedQty: number }[];
  value: number;
  receivedValue: number;
  pendingValue: number;
}

interface PoDetail extends PoRow {
  notes?: string;
  invoices: { _id: string; invoiceNo: string; date: string; total: number; status: string }[];
}

interface Summary {
  openCount: number;
  openValue: number;
  pendingValue: number;
  purchased: number;
  postedInvoices: number;
  draftInvoices: number;
  statusCounts: Record<string, number>;
  vendors: { id: string; name: string; value: number; invoices: number }[];
}

interface InvoiceRow {
  _id: string;
  invoiceNo: string;
  date: string;
  vendor?: { vendorName: string };
  purchaseOrder?: { poNumber: string };
  taxable: number;
  gst: number;
  total: number;
  captureMethod: string;
  status: string;
}

const FILTERS = [
  ["", "All"],
  ["open", "Open"],
  ["partial", "Partial"],
  ["closed", "Closed"],
  ["cancelled", "Cancelled"],
] as const;

function NewPoModal({
  open,
  onClose,
  onSaved,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: RaisePoInitial | null;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ poNumber: "", vendor: "", project: initial?.project ?? "", date: today, expectedDate: "", notes: "" });
  const [lines, setLines] = useState<LineDraft[]>(initial?.lines?.length ? initial.lines : [blankLine()]);
  const [vendors, setVendors] = useState<{ _id: string; vendorName: string }[]>([]);
  const [projects, setProjects] = useState<{ _id: string; projectId: string; name: string }[]>([]);
  const [products, setProducts] = useState<SkuOption[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    apiFetch("/api/vendors?limit=100&sort=vendorName").then((j) => j.success && setVendors(j.data));
    apiFetch("/api/projects?limit=100&sort=projectId").then((j) => j.success && setProjects(j.data));
    apiFetch("/api/products?limit=100&sort=sku").then((j) => j.success && setProducts(j.data));
  }, [open]);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    setSaving(true);
    setError("");
    const res = await apiPost("/api/purchase-orders", {
      ...form,
      project: form.project || undefined,
      lines: lines.filter((l) => l.product).map((l) => ({ product: l.product, quantity: Number(l.quantity), rate: Number(l.rate) })),
    });
    setSaving(false);
    if (res.success === false) return setError(res.error?.message ?? "Could not create the order.");
    setForm({ poNumber: "", vendor: "", project: "", date: today, expectedDate: "", notes: "" });
    setLines([blankLine()]);
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Raise a purchase order" maxWidth="max-w-3xl">
      {!!initial?.lines?.length && (
        <div className="mb-4 border border-warn/30 bg-warn/10 px-3 py-2 text-[12.5px] text-ink-700">
          Pre-filled from a project requirement — pick a supplier, check the rate, and set a PO number.
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormInput label="PO number" required value={form.poNumber} onChange={set("poNumber")} placeholder="DIPL/120-26-27" />
        <FormSelect label="Supplier" required value={form.vendor} onChange={set("vendor")} className="sm:col-span-2">
          <option value="">Select supplier</option>
          {vendors.map((v) => (
            <option key={v._id} value={v._id}>
              {v.vendorName}
            </option>
          ))}
        </FormSelect>
        <FormSelect label="For project" value={form.project} onChange={set("project")}>
          <option value="">General stock</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>
              {p.projectId} · {p.name}
            </option>
          ))}
        </FormSelect>
        <FormInput label="Order date" type="date" value={form.date} onChange={set("date")} />
        <FormInput label="Expected" type="date" value={form.expectedDate} onChange={set("expectedDate")} />
      </div>
      <div className="mt-5">
        <LineEditor lines={lines} onChange={setLines} products={products} />
      </div>
      <FormTextarea label="Notes" value={form.notes} onChange={set("notes")} className="mt-4" />
      {error && <p className="mt-3 text-[13px] text-neg">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Raise order"}
        </Button>
      </div>
    </Modal>
  );
}

function PoDetailModal({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const canCancel = usePermission("purchase_order.approve");
  const [po, setPo] = useState<PoDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiFetch(`/api/purchase-orders/${id}`).then((j) => (j.success ? setPo(j.data) : setError(j.error?.message ?? "Could not load")));
  }, [id]);

  async function cancel() {
    if (!id || !confirm("Cancel this purchase order? Anything already received stays in stock.")) return;
    setBusy(true);
    const res = await apiPatch(`/api/purchase-orders/${id}`, { action: "cancel" });
    setBusy(false);
    if (res.success === false) return setError(res.error?.message ?? "Could not cancel");
    onChanged();
  }

  const shown = po && po._id === id ? po : null;

  return (
    <Modal open={!!id} onClose={onClose} title={shown ? shown.poNumber : "Purchase order"} maxWidth="max-w-3xl">
      {!shown ? (
        error ? <p className="text-[13px] text-neg">{error}</p> : <div className="h-40 bg-paper-200 animate-pulse" />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-600">
            <StatusBadge status={shown.status} />
            <span>{shown.vendor?.vendorName}</span>
            {shown.project && (
              <Link href={`/projects/${shown.project._id}`} className="link">
                {shown.project.projectId}
              </Link>
            )}
            <span>Ordered {shortDate(shown.date)}</span>
            {shown.expectedDate && <span>Expected {shortDate(shown.expectedDate)}</span>}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <Meter pct={shown.value ? (shown.receivedValue / shown.value) * 100 : 0} tone="pos" />
              <span className="tnum text-[12px] text-ink-600 whitespace-nowrap">
                {inr(shown.receivedValue)} of {inr(shown.value)} received
              </span>
            </div>
          </div>
          <div className="border border-paper-200 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">SKU</th>
                  <th className="th text-right">Ordered</th>
                  <th className="th text-right">Received</th>
                  <th className="th text-right">Rate</th>
                  <th className="th text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {shown.lines.map((l) => (
                  <tr key={l._id}>
                    <td className="td">
                      <div className="font-mono text-[11.5px] text-ink-700">{l.product?.sku}</div>
                      <div className="text-[12px] text-ink-500">{l.product?.name}</div>
                    </td>
                    <td className="tdn">{qty(l.quantity, l.product?.unit)}</td>
                    <td className={clsx("tdn", l.receivedQty >= l.quantity ? "text-pos" : l.receivedQty > 0 ? "text-warn" : "text-ink-400")}>
                      {qty(l.receivedQty, l.product?.unit)}
                    </td>
                    <td className="tdn">{inr(l.rate)}</td>
                    <td className="tdn font-medium">{inr(l.quantity * l.rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <div className="label mb-1.5">Bills against this order</div>
            {shown.invoices.length === 0 ? (
              <p className="text-[13px] text-ink-400">No supplier bill captured yet.</p>
            ) : (
              <ul className="divide-y divide-paper-200 border border-paper-200">
                {shown.invoices.map((i) => (
                  <li key={i._id} className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]">
                    <span className="font-mono text-[12px]">{i.invoiceNo}</span>
                    <span className="text-ink-500">{shortDate(i.date)}</span>
                    <span className="tnum">{inr(i.total)}</span>
                    <StatusBadge status={i.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          {shown.notes && <p className="text-[13px] text-ink-600">{shown.notes}</p>}
          {error && <p className="text-[13px] text-neg">{error}</p>}
          <div className="flex flex-wrap justify-between gap-2">
            <Link href="/invoices" className="btn-ghost">
              Capture a bill
            </Link>
            {canCancel && (shown.status === "open" || shown.status === "partial") && (
              <Button variant="danger" onClick={cancel} disabled={busy}>
                Cancel order
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function ProcurementPage() {
  return (
    <Suspense fallback={null}>
      <ProcurementPageInner />
    </Suspense>
  );
}

interface RaisePoInitial {
  project?: string;
  lines?: LineDraft[];
}

function parseRaisePoParam(raw: string | null): RaisePoInitial | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RaisePoInitial;
  } catch {
    return null;
  }
}

function ProcurementPageInner() {
  const canCreate = usePermission("purchase_order.create");
  const canSeeInvoices = usePermission("goods_receipt.view");
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [raisePoInitial] = useState(() => parseRaisePoParam(searchParams.get("raisePo")));
  const [creating, setCreating] = useState(() => !!raisePoInitial);
  const [openId, setOpenId] = useState<string | null>(null);

  const extra = useMemo(() => ({ status }), [status]);
  const { data, loading, page, pages, total, setPage, refetch } = useFetch<PoRow>("/api/purchase-orders", extra);

  const loadSide = useCallback(() => {
    apiFetch("/api/procurement/summary").then((j) => j.success && setSummary(j.data));
    if (canSeeInvoices) apiFetch("/api/invoices?limit=8").then((j) => j.success && setInvoices(j.data));
  }, [canSeeInvoices]);
  useEffect(() => {
    loadSide();
  }, [loadSide]);

  const reload = () => {
    refetch();
    loadSide();
  };

  const vendorTotal = summary?.vendors.reduce((s, v) => s + v.value, 0) ?? 0;
  const counts = summary?.statusCounts ?? {};

  const columns: Column<PoRow>[] = [
    {
      key: "poNumber",
      label: "PO number",
      render: (r) => (
        <button type="button" onClick={() => setOpenId(r._id)} className="link font-mono text-[12px] whitespace-nowrap">
          {r.poNumber}
        </button>
      ),
    },
    { key: "vendor", label: "Supplier", render: (r) => <span className="font-medium text-ink-900">{r.vendor?.vendorName}</span> },
    {
      key: "project",
      label: "Project",
      render: (r) =>
        r.project ? (
          <div>
            <div className="text-[12.5px]">{r.project.name}</div>
            <div className="font-mono text-[11px] text-ink-400">{r.project.projectId}</div>
          </div>
        ) : (
          <span className="text-ink-400">General stock</span>
        ),
    },
    { key: "date", label: "Date", render: (r) => <span className="tnum whitespace-nowrap">{shortDate(r.date)}</span> },
    {
      key: "expectedDate",
      label: "Expected",
      render: (r) => {
        if (!r.expectedDate) return <span className="text-ink-400">—</span>;
        const late = ["open", "partial"].includes(r.status) && new Date(r.expectedDate) < new Date();
        return <span className={clsx("tnum whitespace-nowrap", late && "text-neg font-medium")}>{shortDate(r.expectedDate)}</span>;
      },
    },
    { key: "lines", label: "Lines", className: "text-right", render: (r) => <span className="tnum">{r.lines.length}</span> },
    { key: "value", label: "Value", className: "text-right", render: (r) => <span className="tnum font-medium">{inrShort(r.value)}</span> },
    {
      key: "received",
      label: "Received",
      render: (r) => (
        <div className="flex items-center gap-2 min-w-[110px]">
          <Meter pct={r.value ? (r.receivedValue / r.value) * 100 : 0} tone="pos" />
          <span className="tnum text-[11.5px] text-ink-500 w-9 text-right">{r.value ? Math.round((r.receivedValue / r.value) * 100) : 0}%</span>
        </div>
      ),
    },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-10">
      <PageHeader
        kicker="Supplier · orders and bills"
        title="What was ordered, what arrived"
        description="Purchase orders raised, what suppliers have billed against them, and what is still outstanding."
        actions={
          <div className="flex items-center gap-2">
            <LowStockAlertBell />
            {canCreate && (
              <>
                <Link href="/procurement/new">
                  <Button variant="secondary">
                    <Plus className="h-4 w-4" /> New order
                  </Button>
                </Link>
                <Button onClick={() => setCreating(true)}>
                  <Plus className="h-4 w-4" /> Raise PO
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Open purchase orders" value={summary?.openCount ?? "—"} subtitle={summary ? `${inrShort(summary.openValue)} on order` : undefined} />
        <KpiCard title="Pending receipt" value={summary ? inrShort(summary.pendingValue) : "—"} tone="warn" subtitle="ordered but not yet arrived" />
        <KpiCard
          title="Total purchased"
          value={summary ? inrShort(summary.purchased) : "—"}
          subtitle={summary ? `${summary.postedInvoices} posted invoices · before GST` : undefined}
        />
        <KpiCard title="Active suppliers" value={summary?.vendors.length ?? "—"} subtitle="with posted purchases" />
      </div>

      <section>
        <SectionHeader
          title="Purchase orders"
          description={`${total} order${total === 1 ? "" : "s"}${status ? ` · ${status}` : ""}. Click a PO number for its lines and bills.`}
          actions={
            <div className="flex flex-wrap gap-1">
              {FILTERS.map(([k, label]) => (
                <button
                  key={k || "all"}
                  type="button"
                  onClick={() => {
                    setStatus(k);
                    setPage(1);
                  }}
                  className={clsx(
                    "px-2.5 py-1.5 text-[12px] font-medium border transition-colors",
                    status === k ? "bg-ink-900 text-paper-50 border-ink-900" : "border-paper-300 bg-paper-50 text-ink-600 hover:text-ink-900"
                  )}
                >
                  {label}
                  {k && <span className="tnum opacity-60"> {counts[k] ?? 0}</span>}
                </button>
              ))}
            </div>
          }
        />
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          emptyMessage="No purchase orders here."
          pagination={{ page, pages, total, onPageChange: setPage }}
        />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {canSeeInvoices && (
          <section className="xl:col-span-3">
            <SectionHeader
              title="Supplier invoices"
              description={summary ? `${summary.postedInvoices} posted · ${summary.draftInvoices} awaiting confirmation` : undefined}
              actions={
                <Link href="/invoices" className="link text-[12.5px] inline-flex items-center gap-1">
                  Invoice capture <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="th">Invoice</th>
                      <th className="th">Supplier</th>
                      <th className="th">PO</th>
                      <th className="th text-right">Taxable</th>
                      <th className="th text-right">Total</th>
                      <th className="th">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-[13px] text-ink-400">
                          No invoices captured yet.
                        </td>
                      </tr>
                    )}
                    {invoices.map((i) => (
                      <tr key={i._id} className="hover:bg-paper-100/80">
                        <td className="td">
                          <div className="font-mono text-[12px]">{i.invoiceNo}</div>
                          <div className="text-[11px] text-ink-400">{shortDate(i.date)}</div>
                        </td>
                        <td className="td">{i.vendor?.vendorName}</td>
                        <td className="td font-mono text-[11.5px] text-ink-500">{i.purchaseOrder?.poNumber ?? "—"}</td>
                        <td className="tdn">{inr(i.taxable)}</td>
                        <td className="tdn font-medium">{inr(i.total)}</td>
                        <td className="td">
                          <StatusBadge status={i.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        <section className={canSeeInvoices ? "xl:col-span-2" : "xl:col-span-5"}>
          <SectionHeader title="Supplier-wise purchases" description="Share of posted purchase value by supplier." />
          <div className="card divide-y divide-paper-200">
            {(summary?.vendors.length ?? 0) === 0 && <div className="px-5 py-8 text-[13px] text-ink-400">No posted purchases yet.</div>}
            {summary?.vendors.map((v) => (
              <div key={v.id} className="px-5 py-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13.5px] font-medium text-ink-900 truncate">{v.name}</span>
                  <span className="tnum text-[13.5px] font-semibold text-ink-900">{inrShort(v.value)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-3">
                  <Meter pct={vendorTotal ? (v.value / vendorTotal) * 100 : 0} />
                  <span className="tnum text-[11px] text-ink-500 w-10 text-right">
                    {vendorTotal ? Math.round((v.value / vendorTotal) * 100) : 0}%
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-ink-400">
                  <Chip tone="slate" className="!px-1.5 !text-[10px]">
                    {v.invoices} invoice{v.invoices === 1 ? "" : "s"}
                  </Chip>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <NewPoModal
        open={creating}
        onClose={() => setCreating(false)}
        initial={raisePoInitial}
        onSaved={() => {
          setCreating(false);
          reload();
        }}
      />
      <PoDetailModal
        id={openId}
        onClose={() => setOpenId(null)}
        onChanged={() => {
          setOpenId(null);
          reload();
        }}
      />
    </div>
  );
}
