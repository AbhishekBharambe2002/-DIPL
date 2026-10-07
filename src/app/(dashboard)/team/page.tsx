"use client";

import { useState } from "react";
import { Users, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { FormInput, FormSelect } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { useFetch, apiPost, apiPatch } from "@/hooks/use-api";

interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  role?: string;
  department?: string;
  phone: string;
  email?: string;
  status?: string;
  createdAt: string;
}

const emptyForm = {
  employeeId: "",
  name: "",
  role: "",
  department: "",
  phone: "",
  email: "",
  status: "active",
};

export default function TeamPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const { data, loading, page, pages, total, setPage, setSearch, refetch } =
    useFetch<Employee>("/api/employees");

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  function openCreate() {
    setForm(emptyForm);
    setEditId(null);
    setModalOpen(true);
  }

  function openEdit(e: Employee) {
    setForm({
      employeeId: e.employeeId,
      name: e.name,
      role: e.role || "",
      department: e.department || "",
      phone: e.phone,
      email: e.email || "",
      status: e.status || "active",
    });
    setEditId(e._id);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.employeeId || !form.name || !form.phone) return;
    setSaving(true);
    try {
      if (editId) {
        await apiPatch(`/api/employees/${editId}`, form);
      } else {
        await apiPost("/api/employees", form);
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

  const columns: Column<Employee>[] = [
    { key: "employeeId", label: "Employee ID" },
    { key: "name", label: "Name" },
    { key: "role", label: "Role" },
    { key: "department", label: "Department" },
    { key: "phone", label: "Phone" },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status || "active"} />,
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
        kicker="People · staff"
        title="Team"
        description="Engineers, technicians and store staff on the roster."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Employee
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search employees..."
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
        emptyMessage="No employees found. Click 'Add Employee' to create one."
        pagination={{ page, pages, total, onPageChange: setPage }}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit Employee" : "Add Employee"}
        maxWidth="max-w-2xl"
      >
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Employee ID" required value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)} />
          <FormInput label="Name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
          <FormSelect label="Role" value={form.role} onChange={(e) => set("role", e.target.value)}>
            <option value="">Select role</option>
            <option value="Engineer">Engineer</option>
            <option value="Supervisor">Supervisor</option>
            <option value="Technician">Technician</option>
            <option value="Store Keeper">Store Keeper</option>
            <option value="Manager">Manager</option>
            <option value="Other">Other</option>
          </FormSelect>
          <FormInput label="Department" value={form.department} onChange={(e) => set("department", e.target.value)} />
          <FormInput label="Phone" required value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          <FormInput label="Email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
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
