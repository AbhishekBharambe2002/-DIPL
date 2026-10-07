"use client";

import { useState, useMemo } from "react";
import { ListTodo, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { useFetch, apiPost, apiPatch } from "@/hooks/use-api";

interface Task {
  _id: string;
  title: string;
  description?: string;
  priority: string;
  dueDate?: string;
  status: string;
  progress: number;
  createdAt: string;
}

const emptyForm = {
  title: "",
  description: "",
  priority: "medium",
  dueDate: "",
  status: "todo",
  progress: 0,
};

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
];

export default function TasksPage() {
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
    useFetch<Task>("/api/tasks", extraParams);

  const set = (field: string, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  function openCreate() {
    setForm(emptyForm);
    setEditId(null);
    setModalOpen(true);
  }

  function openEdit(t: Task) {
    setForm({
      title: t.title,
      description: t.description || "",
      priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.slice(0, 10) : "",
      status: t.status,
      progress: t.progress ?? 0,
    });
    setEditId(t._id);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.title) return;
    setSaving(true);
    try {
      if (editId) {
        await apiPatch(`/api/tasks/${editId}`, form);
      } else {
        await apiPost("/api/tasks", form);
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

  const columns: Column<Task>[] = [
    { key: "title", label: "Title" },
    {
      key: "priority",
      label: "Priority",
      render: (row) => <StatusBadge status={row.priority} />,
    },
    {
      key: "dueDate",
      label: "Due Date",
      render: (row) =>
        row.dueDate
          ? new Date(row.dueDate).toLocaleDateString()
          : "—",
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "progress",
      label: "Progress",
      render: (row) => `${row.progress ?? 0}%`,
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
        kicker="Operate · work items"
        title="Tasks"
        description="Work across projects and sites — who owns it and when it is due."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Task
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search tasks..."
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
        emptyMessage="No tasks found. Click 'Add Task' to create one."
        pagination={{ page, pages, total, onPageChange: setPage }}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit Task" : "Add Task"}
        maxWidth="max-w-2xl"
      >
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Title"
            required
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className="col-span-2"
          />
          <FormTextarea
            label="Description"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className="col-span-2"
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
            label="Due Date"
            type="date"
            value={form.dueDate}
            onChange={(e) => set("dueDate", e.target.value)}
          />
          <FormSelect
            label="Status"
            required
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="completed">Completed</option>
          </FormSelect>
          <FormInput
            label="Progress (%)"
            type="number"
            min={0}
            max={100}
            value={form.progress}
            onChange={(e) => set("progress", Number(e.target.value))}
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
