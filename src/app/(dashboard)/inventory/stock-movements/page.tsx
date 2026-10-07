"use client";

import { useState } from "react";
import { ArrowLeftRight, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { useFetch, apiPost } from "@/hooks/use-api";

interface StockTransaction {
  _id: string;
  product?: { name: string } | string;
  warehouse?: { name: string } | string;
  type: string;
  quantity: number;
  previousQuantity?: number;
  newQuantity?: number;
  notes?: string;
  createdAt: string;
}

const emptyForm = {
  product: "",
  warehouse: "",
  type: "purchase",
  quantity: 0,
  notes: "",
};

const typeOptions = [
  "purchase",
  "stock_in",
  "stock_out",
  "site_issue",
  "site_return",
  "transfer",
  "adjustment",
  "damaged",
  "lost",
  "consumed",
];

export default function StockMovementsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const { data, loading, page, pages, total, setPage, setSearch, refetch } =
    useFetch<StockTransaction>("/api/stock-transactions");

  const set = (field: string, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  function openCreate() {
    setForm(emptyForm);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.product || !form.warehouse || !form.quantity) return;
    setSaving(true);
    try {
      await apiPost("/api/stock-transactions", form);
      setModalOpen(false);
      refetch();
    } finally {
      setSaving(false);
    }
  }

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  function getProductName(row: StockTransaction): string {
    if (!row.product) return "—";
    if (typeof row.product === "string") return row.product;
    return row.product.name || "—";
  }

  function getWarehouseName(row: StockTransaction): string {
    if (!row.warehouse) return "—";
    if (typeof row.warehouse === "string") return row.warehouse;
    return row.warehouse.name || "—";
  }

  const columns: Column<StockTransaction>[] = [
    {
      key: "product",
      label: "Product",
      render: (row) => getProductName(row),
    },
    {
      key: "warehouse",
      label: "Warehouse",
      render: (row) => getWarehouseName(row),
    },
    {
      key: "type",
      label: "Type",
      render: (row) => <StatusBadge status={row.type} />,
    },
    { key: "quantity", label: "Quantity" },
    { key: "previousQuantity", label: "Prev Qty" },
    { key: "newQuantity", label: "New Qty" },
    {
      key: "createdAt",
      label: "Date",
      render: (row) =>
        row.createdAt
          ? new Date(row.createdAt).toLocaleDateString()
          : "—",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Records · immutable ledger"
        title="Every movement, still visible"
        description="Received, issued, transferred, returned — each writes one row. Corrections are new rows, not edits."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Transaction
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full border border-paper-300 bg-paper-50 py-2 pl-9 pr-3 text-[13.5px] text-ink-900 placeholder:text-ink-400 focus:border-ink-700 focus:outline-none"
          />
        </div>
        <Button variant="secondary" onClick={handleSearch}>
          Search
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage="No stock transactions found."
        pagination={{ page, pages, total, onPageChange: setPage }}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Stock Transaction"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <FormInput
            label="Product ID"
            required
            value={form.product}
            onChange={(e) => set("product", e.target.value)}
            placeholder="Enter product ObjectId"
          />
          <FormInput
            label="Warehouse ID"
            required
            value={form.warehouse}
            onChange={(e) => set("warehouse", e.target.value)}
            placeholder="Enter warehouse ObjectId"
          />
          <FormSelect
            label="Transaction Type"
            required
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
          >
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </FormSelect>
          <FormInput
            label="Quantity"
            type="number"
            required
            min={1}
            value={form.quantity}
            onChange={(e) => set("quantity", Number(e.target.value))}
          />
          <FormTextarea
            label="Notes"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Create"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
