"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { clsx } from "clsx";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { KpiCard } from "@/components/ui/kpi-card";
import { Chip, Meter } from "@/components/ui/status-badge";
import { useFetch, apiFetch } from "@/hooks/use-api";
import { inr, inrShort, qty } from "@/lib/format";

interface InventoryLevel {
  _id: string;
  product?: {
    sku: string;
    name: string;
    unit: string;
    purchasePrice?: number;
    reorderLevel?: number;
    minimumStock?: number;
  };
  warehouse?: { _id: string; name: string };
  quantity: number;
  reservedQuantity: number;
}

interface Summary {
  total: number;
  lines: number;
  skus: number;
  lowStock: number;
  byWarehouse: { warehouseId: string; name: string; value: number; lines: number; skus: number }[];
}

export default function InventoryPage() {
  const [searchInput, setSearchInput] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);

  const extra = useMemo(() => ({ warehouse }), [warehouse]);
  const { data, loading, page, pages, total, setPage, setSearch } = useFetch<InventoryLevel>(
    "/api/inventory",
    extra
  );

  useEffect(() => {
    apiFetch("/api/inventory/summary").then((j) => j.success && setSummary(j.data));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [searchInput, setSearch, setPage]);

  const columns: Column<InventoryLevel>[] = [
    {
      key: "sku",
      label: "Code",
      render: (r) => <span className="font-mono text-[12px] text-ink-700">{r.product?.sku ?? "—"}</span>,
    },
    {
      key: "product",
      label: "Description",
      render: (r) => <span className="font-medium text-ink-900">{r.product?.name ?? "—"}</span>,
    },
    { key: "warehouse", label: "Location", render: (r) => r.warehouse?.name ?? "—" },
    {
      key: "quantity",
      label: "Qty",
      className: "text-right",
      render: (r) => {
        const threshold = r.product?.reorderLevel ?? r.product?.minimumStock ?? 0;
        const low = r.quantity <= threshold;
        return (
          <span className="inline-flex items-center gap-2 justify-end tnum">
            {low && <Chip tone="red">reorder</Chip>}
            <span className={clsx(low && "text-neg font-semibold")}>{qty(r.quantity, r.product?.unit)}</span>
          </span>
        );
      },
    },
    {
      key: "rate",
      label: "Rate",
      className: "text-right",
      render: (r) => <span className="tnum">{r.product?.purchasePrice ? inr(r.product.purchasePrice) : "—"}</span>,
    },
    {
      key: "value",
      label: "Value",
      className: "text-right",
      render: (r) => (
        <span className="tnum font-medium">{inr(r.quantity * (r.product?.purchasePrice ?? 0))}</span>
      ),
    },
  ];

  const maxWh = Math.max(1, ...(summary?.byWarehouse.map((w) => w.value) ?? [1]));

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Storage · purchase cost"
        title="What is on hand, and where"
        description="Every stock line valued at its purchase rate, warehouse by warehouse. Quantities only move through the stock ledger."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total inventory value"
          value={summary ? inrShort(summary.total) : "—"}
          subtitle={summary ? `${summary.skus} SKUs · ${summary.lines} stock lines` : undefined}
        />
        <KpiCard
          title="Warehouses holding stock"
          value={summary?.byWarehouse.length ?? "—"}
          subtitle={summary?.byWarehouse[0] ? `Largest: ${summary.byWarehouse[0].name}` : undefined}
        />
        <KpiCard
          title="Lines at or below reorder"
          value={summary?.lowStock ?? "—"}
          tone={summary && summary.lowStock > 0 ? "neg" : "default"}
          subtitle="quantity ≤ reorder level"
        />
        <KpiCard
          title="Average line value"
          value={summary && summary.lines ? inrShort(summary.total / summary.lines) : "—"}
          subtitle="value ÷ stock lines"
        />
      </div>

      {summary && summary.byWarehouse.length > 0 && (
        <section>
          <SectionHeader title="Value by location" description="Where the money is sitting right now." />
          <div className="card divide-y divide-paper-200">
            {summary.byWarehouse.map((w) => (
              <button
                key={w.warehouseId}
                type="button"
                onClick={() => {
                  setWarehouse(warehouse === w.warehouseId ? "" : w.warehouseId);
                  setPage(1);
                }}
                className={clsx(
                  "w-full text-left grid grid-cols-[1fr_auto] sm:grid-cols-[200px_1fr_auto] items-center gap-x-5 gap-y-2 px-5 py-3.5 transition-colors",
                  warehouse === w.warehouseId ? "bg-paper-200/70" : "hover:bg-paper-100/80"
                )}
              >
                <div>
                  <div className="text-[13.5px] font-medium text-ink-900">{w.name}</div>
                  <div className="text-[11.5px] text-ink-400">
                    {w.skus} SKUs · {w.lines} lines
                  </div>
                </div>
                <div className="hidden sm:block">
                  <Meter pct={(w.value / maxWh) * 100} />
                </div>
                <div className="text-right">
                  <div className="tnum text-[14px] font-semibold text-ink-900">{inrShort(w.value)}</div>
                  <div className="tnum text-[11px] text-ink-400">
                    {summary.total ? Math.round((w.value / summary.total) * 100) : 0}%
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeader
          title="SKU-wise stock"
          description={
            warehouse
              ? `Filtered to ${summary?.byWarehouse.find((w) => w.warehouseId === warehouse)?.name ?? "one location"}.`
              : "Every location a SKU is held at."
          }
          actions={
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Search by code or description…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="field !pl-8"
              />
            </div>
          }
        />
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          emptyMessage="No stock lines match."
          pagination={{ page, pages, total, onPageChange: setPage }}
        />
      </section>
    </div>
  );
}
