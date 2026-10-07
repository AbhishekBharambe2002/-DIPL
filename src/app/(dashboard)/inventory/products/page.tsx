"use client";

import { useState } from "react";
import { Boxes, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-field";
import { useFetch, apiPost, apiPatch } from "@/hooks/use-api";

interface Product {
  _id: string;
  sku: string;
  name: string;
  category?: string;
  brand?: string;
  modelNumber?: string;
  description?: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  minimumStock: number;
  maximumStock?: number;
  reorderLevel?: number;
  serialTracking?: boolean;
  batchTracking?: boolean;
  warrantyPeriod?: number;
  createdAt: string;
}

const emptyForm = {
  sku: "",
  name: "",
  category: "",
  brand: "",
  modelNumber: "",
  description: "",
  unit: "Nos",
  purchasePrice: "",
  sellingPrice: "",
  minimumStock: "",
  maximumStock: "",
  reorderLevel: "",
  serialTracking: false,
  batchTracking: false,
  warrantyPeriod: "",
};

export default function ProductsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const { data, loading, page, pages, total, setPage, setSearch, refetch } =
    useFetch<Product>("/api/products");

  const set = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  function openCreate() {
    setForm(emptyForm);
    setEditId(null);
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setForm({
      sku: p.sku,
      name: p.name,
      category: p.category || "",
      brand: p.brand || "",
      modelNumber: p.modelNumber || "",
      description: p.description || "",
      unit: p.unit || "Nos",
      purchasePrice: String(p.purchasePrice ?? ""),
      sellingPrice: String(p.sellingPrice ?? ""),
      minimumStock: String(p.minimumStock ?? ""),
      maximumStock: String(p.maximumStock ?? ""),
      reorderLevel: String(p.reorderLevel ?? ""),
      serialTracking: p.serialTracking || false,
      batchTracking: p.batchTracking || false,
      warrantyPeriod: String(p.warrantyPeriod ?? ""),
    });
    setEditId(p._id);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.sku || !form.name || !form.unit) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : 0,
        sellingPrice: form.sellingPrice ? Number(form.sellingPrice) : 0,
        minimumStock: form.minimumStock ? Number(form.minimumStock) : 0,
        maximumStock: form.maximumStock ? Number(form.maximumStock) : 0,
        reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : 0,
        warrantyPeriod: form.warrantyPeriod ? Number(form.warrantyPeriod) : 0,
      };
      if (editId) {
        await apiPatch(`/api/products/${editId}`, payload);
      } else {
        await apiPost("/api/products", payload);
      }
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

  const columns: Column<Product>[] = [
    { key: "sku", label: "SKU" },
    { key: "name", label: "Name" },
    { key: "brand", label: "Brand" },
    { key: "unit", label: "Unit" },
    {
      key: "purchasePrice",
      label: "Purchase Price",
      render: (row) => (row.purchasePrice != null ? `₹${row.purchasePrice.toLocaleString()}` : "—"),
    },
    {
      key: "sellingPrice",
      label: "Selling Price",
      render: (row) => (row.sellingPrice != null ? `₹${row.sellingPrice.toLocaleString()}` : "—"),
    },
    { key: "minimumStock", label: "Min Stock" },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Records · catalogue"
        title="SKU master"
        description="Every item the stores carry — rate, unit and reorder settings."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search products..."
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
        emptyMessage="No products found. Click 'Add Product' to create one."
        pagination={{ page, pages, total, onPageChange: setPage }}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit Product" : "Add Product"}
        maxWidth="max-w-3xl"
      >
        <div className="max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="SKU" required value={form.sku} onChange={(e) => set("sku", e.target.value)} />
            <FormInput label="Name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
            <FormInput label="Category" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Category name" />
            <FormInput label="Brand" value={form.brand} onChange={(e) => set("brand", e.target.value)} />
            <FormInput label="Model Number" value={form.modelNumber} onChange={(e) => set("modelNumber", e.target.value)} />
            <FormSelect label="Unit" required value={form.unit} onChange={(e) => set("unit", e.target.value)}>
              <option value="Nos">Nos</option>
              <option value="Mtrs">Mtrs</option>
              <option value="Kgs">Kgs</option>
              <option value="Ltrs">Ltrs</option>
              <option value="Set">Set</option>
              <option value="Pair">Pair</option>
              <option value="Box">Box</option>
              <option value="Roll">Roll</option>
            </FormSelect>
            <FormInput label="Purchase Price" type="number" value={form.purchasePrice} onChange={(e) => set("purchasePrice", e.target.value)} />
            <FormInput label="Selling Price" type="number" value={form.sellingPrice} onChange={(e) => set("sellingPrice", e.target.value)} />
            <FormInput label="Minimum Stock" type="number" value={form.minimumStock} onChange={(e) => set("minimumStock", e.target.value)} />
            <FormInput label="Maximum Stock" type="number" value={form.maximumStock} onChange={(e) => set("maximumStock", e.target.value)} />
            <FormInput label="Reorder Level" type="number" value={form.reorderLevel} onChange={(e) => set("reorderLevel", e.target.value)} />
            <FormInput label="Warranty Period (months)" type="number" value={form.warrantyPeriod} onChange={(e) => set("warrantyPeriod", e.target.value)} />
            <div className="col-span-2 flex gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.serialTracking}
                  onChange={(e) => set("serialTracking", e.target.checked)}
                  className="h-4 w-4 accent-ink-900"
                />
                Serial Tracking
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.batchTracking}
                  onChange={(e) => set("batchTracking", e.target.checked)}
                  className="h-4 w-4 accent-ink-900"
                />
                Batch Tracking
              </label>
            </div>
            <FormTextarea label="Description" value={form.description} onChange={(e) => set("description", e.target.value)} className="col-span-2" />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editId ? "Update" : "Create"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
