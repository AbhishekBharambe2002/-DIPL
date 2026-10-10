"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Plus } from "lucide-react";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-field";
import { Chip, StatusBadge } from "@/components/ui/status-badge";
import { LineEditor, blankLine, lineTotals, type LineDraft, type SkuOption } from "@/components/procurement/line-editor";
import { useFetch, apiFetch, apiPost } from "@/hooks/use-api";
import { usePermission } from "@/hooks/use-permission";
import { inr, inrShort, qty, shortDate } from "@/lib/format";

interface Invoice {
  _id: string;
  invoiceNo: string;
  date: string;
  vendor?: { _id: string; vendorName: string };
  purchaseOrder?: { poNumber: string };
  warehouse?: { name: string };
  lines: { product?: { sku: string; name: string; unit: string }; quantity: number; rate: number; gstPercent: number }[];
  taxable: number;
  gst: number;
  total: number;
  captureMethod: string;
  status: string;
  postedAt?: string;
  notes?: string;
}

interface OpenPo {
  _id: string;
  poNumber: string;
  vendor?: { _id: string; vendorName: string } | string;
  status: string;
  lines: { product?: { _id: string } | string; quantity: number; rate: number; receivedQty: number }[];
}

const refId = (r: { _id: string } | string | undefined) => (typeof r === "string" ? r : r?._id ?? "");

function CaptureModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const canPost = usePermission("inventory.receive");
  const today = new Date().toISOString().slice(0, 10);
  const blank = { invoiceNo: "", vendor: "", purchaseOrder: "", warehouse: "", date: today, notes: "" };
  const [form, setForm] = useState(blank);
  const [lines, setLines] = useState<LineDraft[]>([blankLine()]);
  const [vendors, setVendors] = useState<{ _id: string; vendorName: string }[]>([]);
  const [warehouses, setWarehouses] = useState<{ _id: string; name: string }[]>([]);
  const [products, setProducts] = useState<SkuOption[]>([]);
  const [pos, setPos] = useState<OpenPo[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    apiFetch("/api/vendors?limit=100&sort=vendorName").then((j) => j.success && setVendors(j.data));
    apiFetch("/api/warehouses?limit=100&sort=name").then((j) => j.success && setWarehouses(j.data));
    apiFetch("/api/products?limit=100&sort=sku").then((j) => j.success && setProducts(j.data));
    Promise.all([apiFetch("/api/purchase-orders?status=open&limit=100"), apiFetch("/api/purchase-orders?status=partial&limit=100")]).then(
      ([a, b]) => setPos([...(a.success ? a.data : []), ...(b.success ? b.data : [])])
    );
  }, [open]);

  const vendorPos = pos.filter((p) => refId(p.vendor as { _id: string }) === form.vendor);

  function pickPo(id: string) {
    setForm({ ...form, purchaseOrder: id });
    const po = pos.find((p) => p._id === id);
    if (!po) return;
    const outstanding = po.lines
      .filter((l) => l.quantity - l.receivedQty > 0)
      .map((l) => ({ product: refId(l.product), quantity: String(l.quantity - l.receivedQty), rate: String(l.rate), gstPercent: "18" }));
    if (outstanding.length) setLines(outstanding);
  }

  async function save(post: boolean) {
    setSaving(true);
    setError("");
    const res = await apiPost("/api/invoices", {
      ...form,
      purchaseOrder: form.purchaseOrder || undefined,
      post,
      lines: lines
        .filter((l) => l.product)
        .map((l) => ({ product: l.product, quantity: Number(l.quantity), rate: Number(l.rate), gstPercent: Number(l.gstPercent) })),
    });
    setSaving(false);
    if (res.success === false) return setError(res.error?.message ?? "Could not save the bill.");
    setForm(blank);
    setLines([blankLine()]);
    onSaved();
  }

  const t = lineTotals(lines, true);

  return (
    <Modal open={open} onClose={onClose} title="Capture a supplier bill" maxWidth="max-w-4xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormSelect
          label="Supplier"
          required
          value={form.vendor}
          onChange={(e) => setForm({ ...form, vendor: e.target.value, purchaseOrder: "" })}
        >
          <option value="">Select supplier</option>
          {vendors.map((v) => (
            <option key={v._id} value={v._id}>
              {v.vendorName}
            </option>
          ))}
        </FormSelect>
        <FormInput label="Invoice number" required value={form.invoiceNo} onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} />
        <FormInput label="Invoice date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <FormSelect
          label="Against purchase order"
          value={form.purchaseOrder}
          onChange={(e) => pickPo(e.target.value)}
          disabled={!form.vendor}
          className="sm:col-span-2"
        >
          <option value="">{form.vendor ? (vendorPos.length ? "No PO / direct purchase" : "No open POs for this supplier") : "Pick a supplier first"}</option>
          {vendorPos.map((p) => (
            <option key={p._id} value={p._id}>
              {p.poNumber} · {p.status}
            </option>
          ))}
        </FormSelect>
        <FormSelect label="Received into" required value={form.warehouse} onChange={(e) => setForm({ ...form, warehouse: e.target.value })}>
          <option value="">Select warehouse</option>
          {warehouses.map((w) => (
            <option key={w._id} value={w._id}>
              {w.name}
            </option>
          ))}
        </FormSelect>
      </div>
      <div className="mt-5">
        <LineEditor lines={lines} onChange={setLines} products={products} withGst />
      </div>
      <FormTextarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-4" />
      <div className="mt-4 border-l-4 border-ink-900 bg-paper-100 px-4 py-3 text-[12.5px] leading-relaxed text-ink-600">
        The rate on the bill becomes the cost of every unit it brings in. Check each line against the printed bill —
        nothing enters stock until you confirm. Stock value to be added: <span className="tnum font-semibold text-ink-900">{inr(t.taxable)}</span>.
      </div>
      {error && <p className="mt-3 text-[13px] text-neg">{error}</p>}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={() => save(false)} disabled={saving}>
          Save as draft
        </Button>
        {canPost && (
          <Button onClick={() => save(true)} disabled={saving}>
            {saving ? "Posting…" : "Confirm & post to stock"}
          </Button>
        )}
      </div>
    </Modal>
  );
}

function ReviewModal({ invoice, onClose, onPosted }: { invoice: Invoice | null; onClose: () => void; onPosted: () => void }) {
  const canPost = usePermission("inventory.receive");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function post() {
    if (!invoice) return;
    setBusy(true);
    setError("");
    const res = await apiPost(`/api/invoices/${invoice._id}/post`, {});
    setBusy(false);
    if (res.success === false) return setError(res.error?.message ?? "Could not post");
    onPosted();
  }

  return (
    <Modal open={!!invoice} onClose={onClose} title={invoice ? `Bill ${invoice.invoiceNo}` : "Bill"} maxWidth="max-w-3xl">
      {invoice && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-600">
            <StatusBadge status={invoice.status} />
            <span className="font-medium text-ink-900">{invoice.vendor?.vendorName}</span>
            <span>{shortDate(invoice.date)}</span>
            {invoice.purchaseOrder && <span className="font-mono text-[12px]">PO {invoice.purchaseOrder.poNumber}</span>}
            <span>into {invoice.warehouse?.name}</span>
          </div>
          <div className="border border-paper-200 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Matched SKU</th>
                  <th className="th text-right">Qty</th>
                  <th className="th text-right">Rate</th>
                  <th className="th text-right">GST</th>
                  <th className="th text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((l, i) => (
                  <tr key={i}>
                    <td className="td">
                      <div className="font-mono text-[11.5px] text-ink-700">{l.product?.sku}</div>
                      <div className="text-[12px] text-ink-500">{l.product?.name}</div>
                    </td>
                    <td className="tdn">{qty(l.quantity, l.product?.unit)}</td>
                    <td className="tdn">{inr(l.rate)}</td>
                    <td className="tdn text-ink-500">{l.gstPercent}%</td>
                    <td className="tdn font-medium">{inr(l.quantity * l.rate)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="td" colSpan={4}>
                    Taxable · GST
                  </td>
                  <td className="tdn">
                    {inr(invoice.taxable)} · {inr(invoice.gst)}
                  </td>
                </tr>
                <tr>
                  <td className="td font-semibold" colSpan={4}>
                    Total
                  </td>
                  <td className="tdn font-semibold">{inr(invoice.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {invoice.notes && <p className="text-[13px] text-ink-600">{invoice.notes}</p>}
          {error && <p className="text-[13px] text-neg">{error}</p>}
          <div className="flex flex-wrap justify-between gap-2">
            {invoice.status === "posted" ? (
              <Link href="/inventory/stock-movements" className="btn-ghost">
                See it in the stock ledger →
              </Link>
            ) : (
              <span className="text-[12.5px] text-ink-500 self-center">Not in stock yet — confirm to post.</span>
            )}
            {invoice.status === "draft" && canPost && (
              <Button onClick={post} disabled={busy}>
                {busy ? "Posting…" : "Confirm & post to stock"}
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function InvoiceCapturePage() {
  const canCreate = usePermission("goods_receipt.create");
  const [status, setStatus] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [review, setReview] = useState<Invoice | null>(null);
  const [summary, setSummary] = useState<{ purchased: number; purchasedGross: number; postedInvoices: number; draftInvoices: number; vendors: unknown[] } | null>(null);

  const extra = useMemo(() => ({ status }), [status]);
  const { data, loading, page, pages, total, setPage, refetch } = useFetch<Invoice>("/api/invoices", extra);

  const loadSummary = useCallback(() => {
    apiFetch("/api/procurement/summary").then((j) => j.success && setSummary(j.data));
  }, []);
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const reload = () => {
    refetch();
    loadSummary();
  };

  const columns: Column<Invoice>[] = [
    {
      key: "invoiceNo",
      label: "Invoice",
      render: (r) => (
        <button type="button" onClick={() => setReview(r)} className="link font-mono text-[12px] whitespace-nowrap">
          {r.invoiceNo}
        </button>
      ),
    },
    { key: "vendor", label: "Supplier", render: (r) => <span className="font-medium text-ink-900">{r.vendor?.vendorName}</span> },
    { key: "date", label: "Date", render: (r) => <span className="tnum whitespace-nowrap">{shortDate(r.date)}</span> },
    { key: "po", label: "PO", render: (r) => <span className="font-mono text-[11.5px] text-ink-500">{r.purchaseOrder?.poNumber ?? "—"}</span> },
    { key: "warehouse", label: "Into", render: (r) => r.warehouse?.name ?? "—" },
    {
      key: "captureMethod",
      label: "Captured",
      render: (r) => <Chip tone={r.captureMethod === "upload" ? "violet" : "slate"}>{r.captureMethod === "upload" ? "read from file" : "keyed in"}</Chip>,
    },
    { key: "taxable", label: "Taxable", className: "text-right", render: (r) => <span className="tnum">{inr(r.taxable)}</span> },
    { key: "total", label: "Total", className: "text-right", render: (r) => <span className="tnum font-medium">{inr(r.total)}</span> },
    {
      key: "status",
      label: "Status",
      render: (r) =>
        r.status === "draft" ? (
          <button type="button" onClick={() => setReview(r)} className="chip bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800">
            review & post
          </button>
        ) : (
          <StatusBadge status={r.status} />
        ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Input · human confirmation"
        title="A bill in, priced stock out"
        description="A supplier invoice becomes a SKU-matched warehouse receipt. The printed rate is the cost of that lot from then on — which is why a person confirms every line before it posts."
        actions={
          canCreate && (
            <Button onClick={() => setCapturing(true)}>
              <Plus className="h-4 w-4" /> Capture a bill
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Bills posted" value={summary?.postedInvoices ?? "—"} subtitle="each wrote warehouse receipts" />
        <KpiCard
          title="Awaiting confirmation"
          value={summary?.draftInvoices ?? "—"}
          tone={summary?.draftInvoices ? "warn" : "default"}
          subtitle="saved, not yet in stock"
        />
        <KpiCard title="Stock value brought in" value={summary ? inrShort(summary.purchased) : "—"} subtitle="taxable value of posted bills" />
        <KpiCard title="Billed incl. GST" value={summary ? inrShort(summary.purchasedGross) : "—"} subtitle="what suppliers will be paid" />
      </div>

      <section>
        <SectionHeader
          title="Recently captured"
          description="How each bill entered the system. Open one to see its lines."
          actions={
            <div className="flex flex-wrap gap-1">
              {[
                ["", "All"],
                ["draft", "Awaiting confirmation"],
                ["posted", "Posted"],
              ].map(([k, label]) => (
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
                </button>
              ))}
            </div>
          }
        />
        <DataTable columns={columns} data={data} loading={loading} emptyMessage="No bills here." pagination={{ page, pages, total, onPageChange: setPage }} />
      </section>

      <CaptureModal
        open={capturing}
        onClose={() => setCapturing(false)}
        onSaved={() => {
          setCapturing(false);
          reload();
        }}
      />
      <ReviewModal
        invoice={review}
        onClose={() => setReview(null)}
        onPosted={() => {
          setReview(null);
          reload();
        }}
      />
    </div>
  );
}
