"use client";

import { useState, useMemo } from "react";
import { Wrench, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { useFetch, apiPost, apiPatch } from "@/hooks/use-api";

interface ServiceRequest {
  _id: string;
  serviceId: string;
  complaint?: string;
  equipment?: string;
  priority: string;
  scheduledDate?: string;
  status: string;
  resolution?: string;
  notes?: string;
  createdAt: string;
}

const emptyForm = {
  serviceId: "",
  complaint: "",
  equipment: "",
  priority: "medium",
  scheduledDate: "",
  status: "open",
  resolution: "",
  notes: "",
};

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "assigned", label: "Assigned" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting", label: "Waiting" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function ServicePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const extraParams = useMemo(
    () => (statusFilter ? { status: statusFilter } : undefined),
    [statusFilter]
  );

  const { data, loading, page, pages, total, setPage, setSearch, refetch } =
    useFetch<ServiceRequest>("/api/service-requests", extraParams);

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  function openCreate() {
    setForm(emptyForm);
    setEditId(null);
    setModalOpen(true);
  }

  function openEdit(s: ServiceRequest) {
    setForm({
      serviceId: s.serviceId,
      complaint: s.complaint || "",
      equipment: s.equipment || "",
      priority: s.priority,
      scheduledDate: s.scheduledDate ? s.scheduledDate.slice(0, 10) : "",
      status: s.status,
      resolution: s.resolution || "",
      notes: s.notes || "",
    });
    setEditId(s._id);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.serviceId) return;
    setSaving(true);
    try {
      if (editId) {
        await apiPatch(`/api/service-requests/${editId}`, form);
      } else {
        await apiPost("/api/service-requests", form);
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

  const columns: Column<ServiceRequest>[] = [
    { key: "serviceId", label: "Service ID" },
    {
      key: "complaint",
      label: "Complaint",
      render: (row) => {
        const text = (row.complaint as string) || "—";
        return text.length > 60 ? text.slice(0, 60) + "..." : text;
      },
    },
    { key: "equipment", label: "Equipment" },
    {
      key: "priority",
      label: "Priority",
      render: (row) => <StatusBadge status={row.priority} />,
    },
    {
      key: "scheduledDate",
      label: "Scheduled Date",
      render: (row) =>
        row.scheduledDate
          ? new Date(row.scheduledDate).toLocaleDateString()
          : "—",
    },
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
        kicker="Operate · after-sales"
        title="Service requests"
        description="Complaints and maintenance calls, from logged to closed."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Request
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search service requests..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full border border-paper-300 bg-paper-50 py-2 pl-9 pr-3 text-[13.5px] text-ink-900 placeholder:text-ink-400 focus:border-ink-700 focus:outline-none"
          />
        </div>
        <Button variant="secondary" onClick={handleSearch}>
          Search
        </Button>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="border border-paper-300 bg-paper-50 px-3 py-2 text-[13.5px] text-ink-900 placeholder:text-ink-400 focus:border-ink-700 focus:outline-none"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage="No service requests found. Click 'Add Request' to create one."
        pagination={{ page, pages, total, onPageChange: setPage }}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit Service Request" : "Add Service Request"}
        maxWidth="max-w-2xl"
      >
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Service ID"
            required
            value={form.serviceId}
            onChange={(e) => set("serviceId", e.target.value)}
          />
          <FormInput
            label="Equipment"
            value={form.equipment}
            onChange={(e) => set("equipment", e.target.value)}
          />
          <FormSelect
            label="Priority"
            required
            value={form.priority}
            onChange={(e) => set("priority", e.target.value)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </FormSelect>
          <FormInput
            label="Scheduled Date"
            type="date"
            value={form.scheduledDate}
            onChange={(e) => set("scheduledDate", e.target.value)}
          />
          <FormSelect
            label="Status"
            required
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
          >
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting">Waiting</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </FormSelect>
          <div /> {/* spacer */}
          <FormTextarea
            label="Complaint"
            value={form.complaint}
            onChange={(e) => set("complaint", e.target.value)}
            className="col-span-2"
          />
          <FormTextarea
            label="Resolution"
            value={form.resolution}
            onChange={(e) => set("resolution", e.target.value)}
            className="col-span-2"
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
