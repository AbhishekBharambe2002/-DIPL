"use client";

import { useState } from "react";
import { UserCog, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { FormInput } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { useFetch, apiPost, apiPatch } from "@/hooks/use-api";

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  role?: string;
  isActive: boolean;
  createdAt: string;
}

const emptyForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  department: "",
  role: "",
  isActive: true,
};

export default function UsersPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const { data, loading, page, pages, total, setPage, setSearch, refetch } =
    useFetch<User>("/api/users");

  const set = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  function openCreate() {
    setForm(emptyForm);
    setEditId(null);
    setModalOpen(true);
  }

  function openEdit(u: User) {
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      phone: u.phone || "",
      department: u.department || "",
      role: (u.role as string) || "",
      isActive: u.isActive,
    });
    setEditId(u._id);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.email) return;
    if (!editId && !form.password) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (editId) {
        // Don't send empty password on edit
        if (!payload.password) delete payload.password;
        await apiPatch(`/api/users/${editId}`, payload);
      } else {
        await apiPost("/api/users", payload);
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

  const columns: Column<User>[] = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "department", label: "Department" },
    {
      key: "isActive",
      label: "Status",
      render: (row) => (
        <StatusBadge status={row.isActive ? "active" : "inactive"} />
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
        kicker="Administration · access"
        title="Users"
        description="People who can sign in, and the role each one carries."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add User
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search users..."
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
        emptyMessage="No users found. Click 'Add User' to create one."
        pagination={{ page, pages, total, onPageChange: setPage }}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit User" : "Add User"}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <FormInput
            label="Name"
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
          <FormInput
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
          {!editId && (
            <FormInput
              label="Password"
              type="password"
              required
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
            />
          )}
          <FormInput
            label="Phone"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
          <FormInput
            label="Department"
            value={form.department}
            onChange={(e) => set("department", e.target.value)}
          />
          <FormInput
            label="Role (ObjectId)"
            value={form.role}
            onChange={(e) => set("role", e.target.value)}
            placeholder="Enter role ObjectId"
          />
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="h-4 w-4 accent-ink-900"
            />
            Active
          </label>
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
