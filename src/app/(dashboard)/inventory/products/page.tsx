"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Chip } from "@/components/ui/status-badge";
import { apiFetch, useFetch } from "@/hooks/use-api";
import { inr, inrShort, qty, shortDate } from "@/lib/format";
import { PendingDeliveriesBell } from "@/components/inventory/pending-deliveries-bell";

/* ── types ── */
interface Material {
  _id: string;
  productId: string;
  name: string;
  category: string;
  subCategory?: string;
  make?: string;
  modelNo?: string;
  unit: string;
  size?: string;
  specs?: Record<string, string | number>;
  sheet: string;
  srNo?: number;
  /* enriched from inventory_logs */
  quantity: number;
  purchasePrice: number;
  totalValue: number;
  addedAt: string | null;
}

interface Summary {
  total: number;
  sheets: string[];
  categories: string[];
  stockValue: number;
  stockQty: number;
}

/* ── short display labels for each sheet tab ── */
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

/* ── page ── */
export default function MaterialCataloguePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [sheet, setSheet] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const extra = useMemo(() => {
    const p: Record<string, string> = { sort: "productId", limit: "50" };
    if (sheet) p.sheet = sheet;
    return p;
  }, [sheet]);

  const { data, loading, page, pages, total, setPage, setSearch } =
    useFetch<Material>("/api/materials", extra);

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

  /* ── table columns ── */
  const columns: Column<Material>[] = [
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
          {r.subCategory && <div className="text-[11.5px] text-ink-400">{r.subCategory}</div>}
        </div>
      ),
    },
    {
      key: "make",
      label: "Make",
      render: (r) => r.make ? <span className="text-ink-700">{r.make}</span> : <span className="text-ink-400">—</span>,
    },
    {
      key: "size",
      label: "Size / Spec",
      render: (r) => r.size ? <span className="whitespace-nowrap text-ink-700">{r.size}</span> : <span className="text-ink-400">—</span>,
    },
    { key: "unit", label: "Unit" },
    {
      key: "category",
      label: "Category",
      render: (r) => <Chip tone="slate">{r.category}</Chip>,
    },
    {
      key: "quantity",
      label: "Qty",
      className: "text-right",
      render: (r) => (
        <span className="tnum font-medium">{r.quantity > 0 ? qty(r.quantity, r.unit) : <span className="text-ink-400">—</span>}</span>
      ),
    },
    {
      key: "rate",
      label: "Purchase rate",
      className: "text-right",
      render: (r) => (
        <span className="tnum">{r.purchasePrice > 0 ? inr(r.purchasePrice) : <span className="text-ink-400">—</span>}</span>
      ),
    },
    {
      key: "value",
      label: "Value",
      className: "text-right",
      render: (r) => {
        const val = r.purchasePrice * r.quantity;
        return (
          <div className="text-right">
            <span className="tnum font-medium">{val > 0 ? inr(val) : <span className="text-ink-400">—</span>}</span>
            {val > 0 && (
              <div className="text-[10.5px] text-ink-400 tnum">
                {inr(r.purchasePrice)} × {r.quantity}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "addedAt",
      label: "Added",
      render: (r) => r.addedAt ? <span className="text-[12px] text-ink-500 whitespace-nowrap">{shortDate(r.addedAt)}</span> : <span className="text-ink-400">—</span>,
    },
  ];

  const sheets = summary?.sheets ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Catalogue · material list"
        title="Every SKU behind the ledger"
        description="The material master — all items from the workbook, one row per product-size variant."
        actions={<PendingDeliveriesBell />}
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="SKUs in catalogue" value={summary?.total ?? "—"} />
        <KpiCard title="Sheets imported" value={summary?.sheets.length ?? "—"} />
        <KpiCard title="Categories" value={summary?.categories.length ?? "—"} />
        <KpiCard
          title="Total stock value"
          value={summary ? inrShort(summary.stockValue) : "—"}
          subtitle="valued at purchase rate"
        />
      </div>

      {/* Search + sheet tabs */}
      <div className="flex flex-col gap-3">
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search code, name, make or size…"
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

      {/* Table */}
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage="No materials match."
        pagination={{ page, pages, total, onPageChange: setPage }}
      />
    </div>
  );
}
