"use client";

import { useState, useMemo } from "react";
import { MapPin, Plus, Search, Filter } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { useFetch, apiPost, apiPatch } from "@/hooks/use-api";

interface Site {
  _id: string;
  siteId: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  contactPerson?: string;
  contactNumber?: string;
  status: string;
  buildingType?: string;
  numberOfFloors?: number;
  constructionStatus?: string;
  notes?: string;
  project?: string;
  customer?: string;
  siteEngineer?: string;
  supervisor?: string;
  createdAt: string;
}

const statusOptions = [
  "not_started",
  "survey",
  "planning",
  "installation",
  "testing",
  "commissioning",
  "completed",
  "maintenance",
  "on_hold",
];

const buildingTypeOptions = [
  "Commercial",
  "Residential",
  "Industrial",
  "Hospital",
  "Hotel",
  "School",
  "Office",
  "Warehouse",
  "Factory",
  "Other",
];

const emptyForm = {
  siteId: "",
  name: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  contactPerson: "",
  contactNumber: "",
  status: "not_started",
  buildingType: "",
  numberOfFloors: "",
  constructionStatus: "",
  notes: "",
  project: "",
  customer: "",
  siteEngineer: "",
  supervisor: "",
};

export default function SitesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const extraParams: Record<string, string> = useMemo(() => {
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    return params;
  }, [statusFilter]);

  const { data, loading, page, pages, total, setPage, setSearch, refetch } =
    useFetch<Site>("/api/sites", extraParams);

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  function openCreate() {
    setForm(emptyForm);
    setEditId(null);
    setModalOpen(true);
  }

  function openEdit(s: Site) {
    setForm({
      siteId: s.siteId || "",
      name: s.name,
      address: s.address || "",
      city: s.city || "",
      state: s.state || "",
      pincode: s.pincode || "",
      contactPerson: s.contactPerson || "",
      contactNumber: s.contactNumber || "",
      status: s.status || "not_started",
      buildingType: s.buildingType || "",
      numberOfFloors: s.numberOfFloors != null ? String(s.numberOfFloors) : "",
      constructionStatus: s.constructionStatus || "",
      notes: s.notes || "",
      project: s.project || "",
      customer: s.customer || "",
      siteEngineer: s.siteEngineer || "",
      supervisor: s.supervisor || "",
    });
    setEditId(s._id);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        numberOfFloors: form.numberOfFloors
          ? Number(form.numberOfFloors)
          : undefined,
      };
      if (editId) {
        await apiPatch(`/api/sites/${editId}`, payload);
      } else {
        await apiPost("/api/sites", payload);
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

  function handleStatusFilter(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  const columns: Column<Site>[] = [
    { key: "siteId", label: "Site ID" },
    { key: "name", label: "Name" },
    { key: "city", label: "City" },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    { key: "buildingType", label: "Building Type" },
    {
      key: "numberOfFloors",
      label: "Floors",
      render: (row) => (
        <span>{row.numberOfFloors != null ? row.numberOfFloors : "—"}</span>
      ),
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
        kicker="Jobs · locations"
        title="Sites"
        description="Buildings under each project, and the stage each one is at."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Site
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search sites..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full border border-paper-300 bg-paper-50 py-2 pl-9 pr-3 text-[13.5px] text-ink-900 placeholder:text-ink-400 focus:border-ink-700 focus:outline-none"
          />
        </div>
        <Button variant="secondary" onClick={handleSearch}>
          Search
        </Button>
        <div className="flex items-center gap-1">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="border border-paper-300 bg-paper-50 py-2 pl-3 pr-8 text-[13.5px] text-ink-900 placeholder:text-ink-400 focus:border-ink-700 focus:outline-none"
          >
            <option value="">All Status</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage="No sites found. Click 'Add Site' to create one."
        pagination={{ page, pages, total, onPageChange: setPage }}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit Site" : "Add Site"}
        maxWidth="max-w-3xl"
      >
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Site ID"
            value={form.siteId}
            onChange={(e) => set("siteId", e.target.value)}
          />
          <FormInput
            label="Name"
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
          <FormInput
            label="Address"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            className="col-span-2"
          />
          <FormInput
            label="City"
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
          />
          <FormInput
            label="State"
            value={form.state}
            onChange={(e) => set("state", e.target.value)}
          />
          <FormInput
            label="Pincode"
            value={form.pincode}
            onChange={(e) => set("pincode", e.target.value)}
          />
          <FormInput
            label="Contact Person"
            value={form.contactPerson}
            onChange={(e) => set("contactPerson", e.target.value)}
          />
          <FormInput
            label="Contact Number"
            value={form.contactNumber}
            onChange={(e) => set("contactNumber", e.target.value)}
          />
          <FormSelect
            label="Status"
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </FormSelect>
          <FormSelect
            label="Building Type"
            value={form.buildingType}
            onChange={(e) => set("buildingType", e.target.value)}
          >
            <option value="">Select type</option>
            {buildingTypeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </FormSelect>
          <FormInput
            label="Number of Floors"
            type="number"
            value={form.numberOfFloors}
            onChange={(e) => set("numberOfFloors", e.target.value)}
          />
          <FormInput
            label="Construction Status"
            value={form.constructionStatus}
            onChange={(e) => set("constructionStatus", e.target.value)}
          />
          <FormInput
            label="Project (ID)"
            placeholder="ObjectId reference"
            value={form.project}
            onChange={(e) => set("project", e.target.value)}
          />
          <FormInput
            label="Customer (ID)"
            placeholder="ObjectId reference"
            value={form.customer}
            onChange={(e) => set("customer", e.target.value)}
          />
          <FormInput
            label="Site Engineer (ID)"
            placeholder="ObjectId reference"
            value={form.siteEngineer}
            onChange={(e) => set("siteEngineer", e.target.value)}
          />
          <FormInput
            label="Supervisor (ID)"
            placeholder="ObjectId reference"
            value={form.supervisor}
            onChange={(e) => set("supervisor", e.target.value)}
          />
          <FormTextarea
            label="Notes"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="col-span-2"
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editId ? "Update" : "Create"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
