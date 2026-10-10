"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { clsx } from "clsx";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { KpiCard } from "@/components/ui/kpi-card";
import { Chip } from "@/components/ui/status-badge";
import { useFetch, apiFetch } from "@/hooks/use-api";
import { inr, inrShort, qty } from "@/lib/format";
import { IncomingOrdersBell } from "@/components/inventory/incoming-orders-bell";
import { LowStockAlertBell } from "@/components/inventory/low-stock-alert-bell";

/* ── types ── */
interface StockRow {
  _id: string;
  productId: string;
  name: string;
  category: string;
  make?: string;
  size?: string;
  unit: string;
  sheet: string;
  quantity: number;
  purchasePrice: number;
  totalValue: number;
}

interface Summary {
  total: number;
  sheets: string[];
  categories: string[];
  stockValue: number;
  stockQty: number;
}

const TAB_LABELS: Record<string, string> = {
  "M.S Reducer & Elbow & Flange": "MS Reducer / Elbow / Flange",
  "HARDWARE FITTING": "Hardware Fitting",
  "Fire Alarm Panel": "Fire Alarm Panel",
  "4 way": "4 Way & Hydrant",
  VALVES: "Valves",
  "Extinguisher Fire": "Extinguisher",
  "Hose Reel & Box": "Hose Reel & Box",
  "Control Panel & Pump": "Control Panel & Pump",
  NewAge: "NewAge",
  "PVC Material": "PVC Material",
  PAINT: "Paint",
  "CABLE": "Cable",
};

export default function InventoryStockPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [sheet, setSheet] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const extra = useMemo(() => {
    const p: Record<string, string> = { sort: "-totalValue", limit: "50" };
    if (sheet) p.sheet = sheet;
    return p;
  }, [sheet]);

  const { data, loading, page, pages, total, setPage, setSearch, refetch } =
    useFetch<StockRow>("/api/inventory/stock", extra);

  const loadSummary = useCallback(() => {
    apiFetch("/api/materials?summary=true").then((j) => {
      if (j.success) setSummary(j.data);
    });
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 250);
    return () => clearTimeout(t);
  }, [searchInput, setSearch, setPage]);

  const columns: Column<StockRow>[] = [
    {
      key: "productId",
      label: "Code",
      render: (r) => (
        <span className="font-mono text-[12px] text-ink-700 whitespace-nowrap">{r.productId}</span>
      ),
    },
    {
      key: "name",
      label: "Description",
      render: (r) => (
        <div className="min-w-[180px]">
          <div className="font-medium text-ink-900">{r.name}</div>
          {r.size && <div className="text-[11.5px] text-ink-400">{r.size}</div>}
        </div>
      ),
    },
    {
      key: "sheet",
      label: "Sheet",
      render: (r) => <Chip tone="slate">{TAB_LABELS[r.sheet] ?? r.sheet}</Chip>,
    },
    {
      key: "quantity",
      label: "Qty",
      className: "text-right",
      render: (r) => (
        <span className={clsx("tnum font-medium", r.quantity <= 10 && "text-neg")}>
          {qty(r.quantity, r.unit)}
        </span>
      ),
    },
    {
      key: "rate",
      label: "Rate",
      className: "text-right",
      render: (r) => <span className="tnum">{inr(r.purchasePrice)}</span>,
    },
    {
      key: "value",
      label: "Value",
      className: "text-right",
      render: (r) => (
        <span className="tnum font-medium">{inr(r.purchasePrice * r.quantity)}</span>
      ),
    },
  ];

  const sheets = summary?.sheets ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Storage · purchase cost"
        title="What is on hand, and where"
        description="Every stock line valued at its purchase rate — one row per material."
        actions={
          <div className="flex items-center gap-2">
            <LowStockAlertBell />
            <IncomingOrdersBell
              onDelivered={() => {
                refetch();
                loadSummary();
              }}
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total stock value"
          value={summary ? inrShort(summary.stockValue) : "—"}
          subtitle="valued at purchase rate"
        />
        <KpiCard
          title="SKUs carrying stock"
          value={summary?.total ?? "—"}
          subtitle={summary ? `of ${summary.total} SKUs` : undefined}
        />
        <KpiCard
          title="Total quantity"
          value={summary ? summary.stockQty.toLocaleString("en-IN") : "—"}
          subtitle="units across all SKUs"
        />
        <KpiCard title="Sheets" value={summary?.sheets.length ?? "—"} />
      </div>

      {/* Search + sheet tabs */}
      <div className="flex flex-col gap-3">
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search by code or description…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="field !pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => { setSheet(""); setPage(1); }}
            className={clsx(
              "px-2.5 py-1.5 text-[12px] font-medium border transition-colors",
              !sheet
                ? "bg-ink-900 text-paper-50 border-ink-900"
                : "border-paper-300 bg-paper-50 text-ink-600 hover:text-ink-900"
            )}
          >
            All
          </button>
          {sheets.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setSheet(s); setPage(1); }}
              className={clsx(
                "px-2.5 py-1.5 text-[12px] font-medium border transition-colors",
                sheet === s
                  ? "bg-ink-900 text-paper-50 border-ink-900"
                  : "border-paper-300 bg-paper-50 text-ink-600 hover:text-ink-900"
              )}
            >
              {TAB_LABELS[s] ?? s}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage="No stock lines match."
        pagination={{ page, pages, total, onPageChange: setPage }}
      />
    </div>
  );
}
