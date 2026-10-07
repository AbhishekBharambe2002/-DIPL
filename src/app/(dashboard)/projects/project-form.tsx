"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-field";
import { apiFetch, apiPatch, apiPost } from "@/hooks/use-api";

export const STATUS_OPTIONS = ["draft", "planning", "approved", "active", "on_hold", "delayed", "completed", "cancelled"];
const PRIORITY_OPTIONS = ["low", "medium", "high", "critical"];
const TYPE_OPTIONS = ["New Installation", "Maintenance", "AMC", "Renovation", "Inspection", "Other"];

type Ref = string | { _id: string } | null | undefined;

export interface ProjectInput {
  _id?: string;
  projectId?: string;
  name?: string;
  projectType?: string;
  description?: string;
  startDate?: string;
  expectedCompletionDate?: string;
  status?: string;
  priority?: string;
  budget?: number;
  location?: string;
  progress?: number;
  notes?: string;
  customer?: Ref;
  projectManager?: Ref;
  projectEngineer?: Ref;
}

const refId = (r: Ref) => (typeof r === "string" ? r : r?._id ?? "");
const label = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function toForm(p?: ProjectInput | null) {
  return {
    projectId: p?.projectId ?? "",
    name: p?.name ?? "",
    projectType: p?.projectType ?? "",
    description: p?.description ?? "",
    startDate: p?.startDate?.slice(0, 10) ?? "",
    expectedCompletionDate: p?.expectedCompletionDate?.slice(0, 10) ?? "",
    status: p?.status ?? "draft",
    priority: p?.priority ?? "medium",
    budget: p?.budget != null ? String(p.budget) : "",
    location: p?.location ?? "",
    progress: p?.progress != null ? String(p.progress) : "0",
    notes: p?.notes ?? "",
    customer: refId(p?.customer),
    projectManager: refId(p?.projectManager),
    projectEngineer: refId(p?.projectEngineer),
  };
}

interface Option {
  _id: string;
  companyName?: string;
  name?: string;
  role?: string;
}

export function ProjectFormModal({
  open,
  project,
  onClose,
  onSaved,
}: {
  open: boolean;
  project?: ProjectInput | null;
  onClose: () => void;
  onSaved: (id?: string) => void;
}) {
  const [form, setForm] = useState(() => toForm(project));
  const [customers, setCustomers] = useState<Option[]>([]);
  const [employees, setEmployees] = useState<Option[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const editing = Boolean(project?._id);

  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const key = open ? project?._id ?? "new" : null;
  if (key !== openedFor) {
    setOpenedFor(key);
    if (key) {
      setForm(toForm(project));
      setError("");
    }
  }

  useEffect(() => {
    if (!open) return;
    apiFetch("/api/customers?limit=100&sort=companyName").then((j) => j.success && setCustomers(j.data));
    apiFetch("/api/employees?limit=100&sort=name").then((j) => j.success && setEmployees(j.data));
  }, [open]);

  const set = (k: keyof ReturnType<typeof toForm>) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    if (!form.name.trim() || !form.projectId.trim() || !form.customer) {
      setError("Project ID, name and customer are required.");
      return;
    }
    const progress = Number(form.progress || 0);
    if (progress < 0 || progress > 100) {
      setError("Progress must be between 0 and 100.");
      return;
    }
    setSaving(true);
    setError("");
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) if (v !== "") payload[k] = v;
    payload.progress = progress;
    if (form.budget) payload.budget = Number(form.budget);

    const res = editing
      ? await apiPatch(`/api/projects/${project!._id}`, payload)
      : await apiPost("/api/projects", payload);
    setSaving(false);
    if (res.success === false) {
      setError(res.error?.message ?? "Could not save the project.");
      return;
    }
    onSaved(res.data?._id);
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit project" : "New project"} maxWidth="max-w-3xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormInput label="Project ID" required value={form.projectId} onChange={set("projectId")} placeholder="PRJ-2026-001" />
        <FormInput label="Name" required value={form.name} onChange={set("name")} />
        <FormSelect label="Customer" required value={form.customer} onChange={set("customer")}>
          <option value="">Select customer</option>
          {customers.map((c) => (
            <option key={c._id} value={c._id}>
              {c.companyName}
            </option>
          ))}
        </FormSelect>
        <FormSelect label="Project type" value={form.projectType} onChange={set("projectType")}>
          <option value="">Select type</option>
          {TYPE_OPTIONS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </FormSelect>
        <FormSelect label="Status" value={form.status} onChange={set("status")}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </FormSelect>
        <FormSelect label="Priority" value={form.priority} onChange={set("priority")}>
          {PRIORITY_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </FormSelect>
        <FormInput label="Contract value (₹)" type="number" min={0} value={form.budget} onChange={set("budget")} />
        <FormInput label="Completion (%)" type="number" min={0} max={100} value={form.progress} onChange={set("progress")} />
        <FormSelect label="Project manager" value={form.projectManager} onChange={set("projectManager")}>
          <option value="">—</option>
          {employees.map((e) => (
            <option key={e._id} value={e._id}>
              {e.name} {e.role ? `· ${e.role}` : ""}
            </option>
          ))}
        </FormSelect>
        <FormSelect label="Project engineer" value={form.projectEngineer} onChange={set("projectEngineer")}>
          <option value="">—</option>
          {employees.map((e) => (
            <option key={e._id} value={e._id}>
              {e.name} {e.role ? `· ${e.role}` : ""}
            </option>
          ))}
        </FormSelect>
        <FormInput label="Start date" type="date" value={form.startDate} onChange={set("startDate")} />
        <FormInput label="Expected completion" type="date" value={form.expectedCompletionDate} onChange={set("expectedCompletionDate")} />
        <FormInput label="Location" value={form.location} onChange={set("location")} className="sm:col-span-2" />
        <FormTextarea label="Description" value={form.description} onChange={set("description")} className="sm:col-span-2" />
      </div>
      <p className="mt-3 text-[12px] text-ink-400">
        Once BOQ lines are added, contract value is taken from the BOQ total.
      </p>
      {error && <p className="mt-3 text-[13px] text-neg">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : editing ? "Save changes" : "Create project"}
        </Button>
      </div>
    </Modal>
  );
}
