"use client";

import { useState } from "react";
import { Building2, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-field";
import { useFetch, apiPost, apiPatch } from "@/hooks/use-api";

interface Customer {
  _id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  city?: string;
  state?: string;
  customerType?: string;
  gst?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

const emptyForm = {
  companyName: "",
  contactPerson: "",
  phone: "",
  email: "",
  city: "",
  state: "",
  customerType: "",
  gst: "",
  address: "",
  notes: "",
};

export default function CustomersPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const { data, loading, page, pages, total, setPage, setSearch, refetch } =
    useFetch<Customer>("/api/customers");

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  function openCreate() {
    setForm(emptyForm);
    setEditId(null);
    setModalOpen(true);
  }

  function openEdit(c: Customer) {
    setForm({
      companyName: c.companyName,
      contactPerson: c.contactPerson,
      phone: c.phone,
      email: c.email || "",
      city: c.city || "",
      state: c.state || "",
      customerType: c.customerType || "",
      gst: c.gst || "",
      address: c.address || "",
      notes: c.notes || "",
    });
    setEditId(c._id);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.companyName || !form.contactPerson || !form.phone) return;
    setSaving(true);
    try {
      if (editId) {
        await apiPatch(`/api/customers/${editId}`, form);
      } else {
        await apiPost("/api/customers", form);
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

  const columns: Column<Customer>[] = [
    { key: "companyName", label: "Company" },
    { key: "contactPerson", label: "Contact Person" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "city", label: "City" },
    { key: "customerType", label: "Type" },
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
        kicker="People · clients"
        title="Customers"
        description="Client companies and contacts behind every project."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Customer
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search customers..."
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
        emptyMessage="No customers found. Click 'Add Customer' to create one."
        pagination={{ page, pages, total, onPageChange: setPage }}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit Customer" : "Add Customer"}
        maxWidth="max-w-2xl"
      >
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Company Name" required value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
          <FormInput label="Contact Person" required value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} />
          <FormInput label="Phone" required value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          <FormInput label="Email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          <FormInput label="City" value={form.city} onChange={(e) => set("city", e.target.value)} />
          <FormInput label="State" value={form.state} onChange={(e) => set("state", e.target.value)} />
          <FormSelect label="Customer Type" value={form.customerType} onChange={(e) => set("customerType", e.target.value)}>
            <option value="">Select type</option>
            <option value="Developer">Developer</option>
            <option value="Commercial">Commercial</option>
            <option value="Industrial">Industrial</option>
            <option value="Residential">Residential</option>
            <option value="Government">Government</option>
            <option value="Other">Other</option>
          </FormSelect>
          <FormInput label="GST Number" value={form.gst} onChange={(e) => set("gst", e.target.value)} />
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
