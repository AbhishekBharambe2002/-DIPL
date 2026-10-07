"use client";

import { useState } from "react";
import { Store, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-field";
import { useFetch, apiPost, apiPatch } from "@/hooks/use-api";

interface Vendor {
  _id: string;
  vendorName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  city?: string;
  state?: string;
  gst?: string;
  productsSupplied?: string;
  paymentTerms?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

const emptyForm = {
  vendorName: "",
  contactPerson: "",
  phone: "",
  email: "",
  city: "",
  state: "",
  gst: "",
  productsSupplied: "",
  paymentTerms: "",
  address: "",
  notes: "",
};

export default function VendorsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const { data, loading, page, pages, total, setPage, setSearch, refetch } =
    useFetch<Vendor>("/api/vendors");

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  function openCreate() {
    setForm(emptyForm);
    setEditId(null);
    setModalOpen(true);
  }

  function openEdit(v: Vendor) {
    setForm({
      vendorName: v.vendorName,
      contactPerson: v.contactPerson,
      phone: v.phone,
      email: v.email || "",
      city: v.city || "",
      state: v.state || "",
      gst: v.gst || "",
      productsSupplied: v.productsSupplied || "",
      paymentTerms: v.paymentTerms || "",
      address: v.address || "",
      notes: v.notes || "",
    });
    setEditId(v._id);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.vendorName || !form.contactPerson || !form.phone) return;
    setSaving(true);
    try {
      if (editId) {
        await apiPatch(`/api/vendors/${editId}`, form);
      } else {
        await apiPost("/api/vendors", form);
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

  const columns: Column<Vendor>[] = [
    { key: "vendorName", label: "Vendor Name" },
    { key: "contactPerson", label: "Contact Person" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "city", label: "City" },
    { key: "paymentTerms", label: "Payment Terms" },
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
        kicker="People · suppliers"
        title="Vendors"
        description="Suppliers, their terms and who to call."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Vendor
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search vendors..."
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
        emptyMessage="No vendors found. Click 'Add Vendor' to create one."
        pagination={{ page, pages, total, onPageChange: setPage }}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit Vendor" : "Add Vendor"}
        maxWidth="max-w-2xl"
      >
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Vendor Name" required value={form.vendorName} onChange={(e) => set("vendorName", e.target.value)} />
          <FormInput label="Contact Person" required value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} />
          <FormInput label="Phone" required value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          <FormInput label="Email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          <FormInput label="City" value={form.city} onChange={(e) => set("city", e.target.value)} />
          <FormInput label="State" value={form.state} onChange={(e) => set("state", e.target.value)} />
          <FormInput label="GST Number" value={form.gst} onChange={(e) => set("gst", e.target.value)} />
          <FormSelect label="Payment Terms" value={form.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)}>
            <option value="">Select terms</option>
            <option value="Net 30">Net 30</option>
            <option value="Net 45">Net 45</option>
            <option value="Net 60">Net 60</option>
            <option value="Advance">Advance</option>
            <option value="COD">COD</option>
          </FormSelect>
          <FormInput label="Products Supplied" value={form.productsSupplied} onChange={(e) => set("productsSupplied", e.target.value)} className="col-span-2" />
          <FormInput label="Address" value={form.address} onChange={(e) => set("address", e.target.value)} className="col-span-2" />
          <FormTextarea label="Notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} className="col-span-2" />
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
