"use client";

import { useState } from "react";
import { MapPinCheck, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { FormInput, FormTextarea } from "@/components/ui/form-field";
import { useFetch, apiPost, apiPatch } from "@/hooks/use-api";

interface SiteVisit {
  _id: string;
  visitDate?: string;
  checkInTime?: string;
  checkOutTime?: string;
  purpose: string;
  location?: string;
  notes?: string;
  issuesFound?: string;
  workCompleted?: string;
  nextAction?: string;
  createdAt: string;
}

const emptyForm = {
  visitDate: "",
  checkInTime: "",
  checkOutTime: "",
  purpose: "",
  location: "",
  notes: "",
  issuesFound: "",
  workCompleted: "",
  nextAction: "",
};

export default function SiteTrackingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const { data, loading, page, pages, total, setPage, setSearch, refetch } =
    useFetch<SiteVisit>("/api/site-visits");

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  function openCreate() {
    setForm(emptyForm);
    setEditId(null);
    setModalOpen(true);
  }

  function openEdit(v: SiteVisit) {
    setForm({
      visitDate: v.visitDate ? v.visitDate.slice(0, 10) : "",
      checkInTime: v.checkInTime ? v.checkInTime.slice(0, 16) : "",
      checkOutTime: v.checkOutTime ? v.checkOutTime.slice(0, 16) : "",
      purpose: v.purpose || "",
      location: v.location || "",
      notes: v.notes || "",
      issuesFound: v.issuesFound || "",
      workCompleted: v.workCompleted || "",
      nextAction: v.nextAction || "",
    });
    setEditId(v._id);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.purpose) return;
    setSaving(true);
    try {
      if (editId) {
        await apiPatch(`/api/site-visits/${editId}`, form);
      } else {
        await apiPost("/api/site-visits", form);
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

  const columns: Column<SiteVisit>[] = [
    {
      key: "visitDate",
      label: "Visit Date",
      render: (row) =>
        row.visitDate
          ? new Date(row.visitDate).toLocaleDateString()
          : "—",
    },
    { key: "purpose", label: "Purpose" },
    {
      key: "checkInTime",
      label: "Check In",
      render: (row) =>
        row.checkInTime
          ? new Date(row.checkInTime).toLocaleString()
          : "—",
    },
    {
      key: "checkOutTime",
      label: "Check Out",
      render: (row) =>
        row.checkOutTime
          ? new Date(row.checkOutTime).toLocaleString()
          : "—",
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
        kicker="Operate · on the ground"
        title="Site tracking"
        description="Check-ins, work done and issues found, visit by visit."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Visit
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search visits..."
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
        emptyMessage="No site visits found. Click 'Add Visit' to log one."
        pagination={{ page, pages, total, onPageChange: setPage }}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit Site Visit" : "Add Site Visit"}
        maxWidth="max-w-2xl"
      >
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Visit Date"
            type="date"
            value={form.visitDate}
            onChange={(e) => set("visitDate", e.target.value)}
          />
          <FormInput
            label="Location"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
          />
          <FormInput
            label="Check-In Time"
            type="datetime-local"
            value={form.checkInTime}
            onChange={(e) => set("checkInTime", e.target.value)}
          />
          <FormInput
            label="Check-Out Time"
            type="datetime-local"
            value={form.checkOutTime}
            onChange={(e) => set("checkOutTime", e.target.value)}
          />
          <FormInput
            label="Purpose"
            required
            value={form.purpose}
            onChange={(e) => set("purpose", e.target.value)}
            className="col-span-2"
          />
          <FormTextarea
            label="Notes"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="col-span-2"
          />
          <FormTextarea
            label="Issues Found"
            value={form.issuesFound}
            onChange={(e) => set("issuesFound", e.target.value)}
            className="col-span-2"
          />
          <FormTextarea
            label="Work Completed"
            value={form.workCompleted}
            onChange={(e) => set("workCompleted", e.target.value)}
            className="col-span-2"
          />
          <FormTextarea
            label="Next Action"
            value={form.nextAction}
            onChange={(e) => set("nextAction", e.target.value)}
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
