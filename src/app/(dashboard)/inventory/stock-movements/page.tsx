"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { Plus } from "lucide-react";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-field";
import { Chip, type Tone } from "@/components/ui/status-badge";
import { useFetch, apiFetch, apiPost } from "@/hooks/use-api";
import { usePermissions } from "@/hooks/use-permission";
import { inr, qty } from "@/lib/format";

interface Txn {
  _id: string;
  type: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  notes?: string;
  createdAt: string;
  product?: { sku: string; name: string; unit: string; purchasePrice?: number };
  warehouse?: { name: string };
  project?: { projectId: string; name: string };
  createdBy?: { name: string };
}

const MOVE_TYPES: Record<string, { label: string; tone: Tone; permission: string; site?: boolean }> = {
  purchase: { label: "Warehouse receipt", tone: "green", permission: "inventory.receive" },
  stock_in: { label: "Stock in", tone: "green", permission: "inventory.receive" },
  stock_out: { label: "Stock out", tone: "slate", permission: "inventory.issue" },
  site_issue: { label: "Dispatch to site", tone: "blue", permission: "inventory.issue", site: true },
  consumed: { label: "Consumed at site", tone: "violet", permission: "inventory.issue", site: true },
  site_return: { label: "Returned to store", tone: "amber", permission: "inventory.receive", site: true },
  transfer: { label: "Transfer out", tone: "blue", permission: "inventory.transfer" },
  adjustment: { label: "Count adjustment", tone: "slate", permission: "inventory.adjust" },
  damaged: { label: "Damaged", tone: "red", permission: "inventory.adjust" },
  lost: { label: "Lost", tone: "red", permission: "inventory.adjust" },
};

interface Option {
  _id: string;
  name?: string;
  sku?: string;
  projectId?: string;
  unit?: string;
}

const empty = { type: "purchase", product: "", warehouse: "", project: "", quantity: "", notes: "" };

function NewMovementModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const perms = usePermissions();
  const [form, setForm] = useState(empty);
  const [products, setProducts] = useState<Option[]>([]);
  const [warehouses, setWarehouses] = useState<Option[]>([]);
  const [projects, setProjects] = useState<Option[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    apiFetch("/api/products?limit=100&sort=sku").then((j) => j.success && setProducts(j.data));
    apiFetch("/api/warehouses?limit=100&sort=name").then((j) => j.success && setWarehouses(j.data));
    apiFetch("/api/projects?limit=100&sort=projectId").then((j) => j.success && setProjects(j.data));
  }, [open]);

  const allowed = Object.entries(MOVE_TYPES).filter(([, m]) => perms.includes(m.permission));
  const meta = MOVE_TYPES[form.type];
  const unit = products.find((p) => p._id === form.product)?.unit;
  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    if (!form.product || !form.warehouse || !form.quantity) return setError("Product, warehouse and quantity are required.");
    if (meta?.site && !form.project) return setError("Choose the project this site movement belongs to.");
    setSaving(true);
    setError("");
    const res = await apiPost("/api/stock-transactions", {
      ...form,
      quantity: Number(form.quantity),
      project: meta?.site ? form.project : undefined,
    });
    setSaving(false);
    if (res.success === false) return setError(res.error?.message ?? "Could not post the movement.");
    setForm(empty);
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Post a movement" maxWidth="max-w-xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormSelect label="Movement" required value={form.type} onChange={set("type")} className="sm:col-span-2">
          {allowed.map(([k, m]) => (
            <option key={k} value={k}>
              {m.label}
            </option>
          ))}
        </FormSelect>
        <FormSelect label="SKU" required value={form.product} onChange={set("product")} className="sm:col-span-2">
          <option value="">Select SKU</option>
          {products.map((p) => (
            <option key={p._id} value={p._id}>
              {p.sku} · {p.name}
            </option>
          ))}
        </FormSelect>
        <FormSelect label={meta?.site ? "Store it moves from / to" : "Warehouse"} required value={form.warehouse} onChange={set("warehouse")}>
          <option value="">Select warehouse</option>
          {warehouses.map((w) => (
            <option key={w._id} value={w._id}>
              {w.name}
            </option>
          ))}
        </FormSelect>
        <FormInput
          label={form.type === "adjustment" ? `New counted quantity${unit ? ` (${unit})` : ""}` : `Quantity${unit ? ` (${unit})` : ""}`}
          required
          type="number"
          min={0}
          value={form.quantity}
          onChange={set("quantity")}
        />
        {meta?.site && (
          <FormSelect label="Project" required value={form.project} onChange={set("project")} className="sm:col-span-2">
            <option value="">Select project</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.projectId} · {p.name}
              </option>
            ))}
          </FormSelect>
        )}
        <FormTextarea label="Reference / notes" value={form.notes} onChange={set("notes")} className="sm:col-span-2" placeholder="Invoice no, challan, reason…" />
      </div>
      <p className="mt-3 text-[12px] text-ink-400">
        Movements are append-only. To correct a mistake, post a new movement that reverses it.
      </p>
      {error && <p className="mt-3 text-[13px] text-neg">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? "Posting…" : "Post movement"}
        </Button>
      </div>
    </Modal>
  );
}

export default function StockLedgerPage() {
  const perms = usePermissions();
  const canPost = Object.values(MOVE_TYPES).some((m) => perms.includes(m.permission));
  const [type, setType] = useState("");
  const [modal, setModal] = useState(false);
  const [summary, setSummary] = useState<{ total: number; postedToday: number; lastWeek: number; byType: Record<string, number> } | null>(null);

  const extra = useMemo(() => ({ type }), [type]);
  const { data, loading, page, pages, total, setPage, refetch } = useFetch<Txn>("/api/stock-transactions", extra);

  const loadSummary = useCallback(() => {
    apiFetch("/api/stock-transactions/summary").then((j) => j.success && setSummary(j.data));
  }, []);
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const typesInUse = summary ? Object.keys(summary.byType).length : 0;
  const siteMoves = summary ? (summary.byType.site_issue ?? 0) + (summary.byType.consumed ?? 0) + (summary.byType.site_return ?? 0) : 0;

  const columns: Column<Txn>[] = [
    {
      key: "createdAt",
      label: "Date & time",
      render: (r) => (
        <span className="tnum whitespace-nowrap text-ink-600">
          {new Date(r.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (r) => <Chip tone={MOVE_TYPES[r.type]?.tone ?? "slate"}>{MOVE_TYPES[r.type]?.label ?? r.type}</Chip>,
    },
    {
      key: "product",
      label: "SKU",
      render: (r) => (
        <div className="min-w-[180px]">
          <div className="font-mono text-[11.5px] text-ink-700">{r.product?.sku}</div>
          <div className="text-[12px] text-ink-500 truncate max-w-[260px]">{r.product?.name}</div>
        </div>
      ),
    },
    {
      key: "project",
      label: "Project",
      render: (r) => (r.project ? <span className="font-mono text-[12px] whitespace-nowrap">{r.project.projectId}</span> : <span className="text-ink-400">—</span>),
    },
    { key: "quantity", label: "Qty", className: "text-right", render: (r) => <span className="tnum">{qty(r.quantity, r.product?.unit)}</span> },
    {
      key: "rate",
      label: "Rate",
      className: "text-right",
      render: (r) => <span className="tnum text-ink-500">{r.product?.purchasePrice ? inr(r.product.purchasePrice) : "—"}</span>,
    },
    {
      key: "value",
      label: "Value",
      className: "text-right",
      render: (r) => <span className="tnum font-medium">{inr(r.quantity * (r.product?.purchasePrice ?? 0))}</span>,
    },
    {
      key: "route",
      label: "From → To",
      render: (r) => {
        const wh = r.warehouse?.name ?? "—";
        const site = r.project ? `Site · ${r.project.projectId}` : "";
        const map: Record<string, [string, string]> = {
          purchase: ["Supplier", wh],
          stock_in: ["—", wh],
          stock_out: [wh, "—"],
          site_issue: [wh, site],
          consumed: [site, "Installed"],
          site_return: [site, wh],
          transfer: [wh, "Other store"],
          adjustment: [wh, "Count"],
          damaged: [wh, "Written off"],
          lost: [wh, "Written off"],
        };
        const [from, to] = map[r.type] ?? [wh, "—"];
        return (
          <span className="whitespace-nowrap text-[12px] text-ink-600">
            {from} <span className="text-ink-400">→</span> {to}
          </span>
        );
      },
    },
    { key: "user", label: "User", render: (r) => <span className="whitespace-nowrap text-[12px]">{r.createdBy?.name ?? "—"}</span> },
    { key: "notes", label: "Reference", render: (r) => <span className="text-[12px] text-ink-500">{r.notes || "—"}</span> },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Immutable ledger"
        title="Every movement, still visible"
        description="Received, dispatched, consumed, returned — each writes one append-only row: who, when, which SKU, quantity, rate and value. Nothing here is updated or deleted. A correction is a new row, and both stay."
        actions={
          canPost && (
            <Button onClick={() => setModal(true)}>
              <Plus className="h-4 w-4" /> Post movement
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total transactions" value={summary?.total ?? "—"} subtitle="append-only — corrections are new entries" />
        <KpiCard
          title="Site movements"
          value={siteMoves}
          subtitle={summary?.total ? `${Math.round((siteMoves / summary.total) * 100)}% dispatch, consumption or return` : undefined}
        />
        <KpiCard title="Movement types in use" value={`${typesInUse} of ${Object.keys(MOVE_TYPES).length}`} subtitle="distinct types recorded" />
        <KpiCard title="Posted today" value={summary?.postedToday ?? "—"} subtitle={`${summary?.lastWeek ?? 0} in the last 7 days`} />
      </div>

      <section>
        <SectionHeader
          title="Ledger"
          description="Newest first."
          actions={
            <div className="flex flex-wrap gap-1">
              {[["", "All"], ...Object.entries(MOVE_TYPES).filter(([k]) => summary?.byType[k]).map(([k, m]) => [k, m.label])].map(([k, label]) => (
                <button
                  key={k || "all"}
                  type="button"
                  onClick={() => {
                    setType(k);
                    setPage(1);
                  }}
                  className={clsx(
                    "px-2.5 py-1.5 text-[12px] font-medium border transition-colors",
                    type === k ? "bg-ink-900 text-paper-50 border-ink-900" : "border-paper-300 bg-paper-50 text-ink-600 hover:text-ink-900"
                  )}
                >
                  {label}
                  {k && <span className="tnum opacity-60"> {summary?.byType[k]}</span>}
                </button>
              ))}
            </div>
          }
        />
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          emptyMessage="No movements posted yet."
          pagination={{ page, pages, total, onPageChange: setPage }}
        />
      </section>

      <NewMovementModal
        open={modal}
        onClose={() => setModal(false)}
        onSaved={() => {
          setModal(false);
          refetch();
          loadSummary();
        }}
      />
    </div>
  );
}
