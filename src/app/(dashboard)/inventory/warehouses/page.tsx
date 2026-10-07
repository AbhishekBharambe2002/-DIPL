"use client";

import { useState } from "react";
import { Warehouse, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { FormInput, FormSelect } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { useFetch, apiPost, apiPatch } from "@/hooks/use-api";

interface WarehouseItem {
  _id: string;
  name: string;
  location?: string;
  contactNumber?: string;
  status: string;
  createdAt: string;
}

const emptyForm = {
  name: "",
  location: "",
  contactNumber: "",
  status: "active",
};

export default function WarehousesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const { data, loading, page, pages, total, setPage, setSearch, refetch } =
    useFetch<WarehouseItem>("/api/warehouses");

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  function openCreate() {
    setForm(emptyForm);
    setEditId(null);
    setModalOpen(true);
  }

  function openEdit(w: WarehouseItem) {
    setForm({
      name: w.name,
      location: w.location || "",
      contactNumber: w.contactNumber || "",
      status: w.status || "active",
    });
    setEditId(w._id);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name) return;
    setSaving(true);
    try {
      if (editId) {
        await apiPatch(`/api/warehouses/${editId}`, form);
      } else {
        await apiPost("/api/warehouses", form);
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

  const columns: Column<WarehouseItem>[] = [
    { key: "name", label: "Name" },
    { key: "location", label: "Location" },
    { key: "contactNumber", label: "Contact Number" },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
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
        kicker="Records · storage"
        title="Warehouses"
        description="Stores where stock is held, and who to call there."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Warehouse
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search warehouses..."
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
        emptyMessage="No warehouses found. Click 'Add Warehouse' to create one."
        pagination={{ page, pages, total, onPageChange: setPage }}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit Warehouse" : "Add Warehouse"}
      >
        <div className="grid grid-cols-1 gap-4">
          <FormInput label="Name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
          <FormInput label="Location" value={form.location} onChange={(e) => set("location", e.target.value)} />
          <FormInput label="Contact Number" value={form.contactNumber} onChange={(e) => set("contactNumber", e.target.value)} />
          <FormSelect label="Status" value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </FormSelect>
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
