"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-field";
import { apiFetch, apiPatch, apiPost, apiPut } from "@/hooks/use-api";
import { ExpectedMaterials, type ExpectedItem } from "@/components/projects/expected-materials";

export const STATUS_OPTIONS = ["draft", "planning", "approved", "active", "on_hold", "delayed", "completed", "cancelled"];
const PRIORITY_OPTIONS = ["low", "medium", "high", "critical"];
const TYPE_OPTIONS = ["New Installation", "Maintenance", "AMC", "Renovation", "Inspection", "Other"];

type Ref = string | { _id: string; companyName?: string } | null | undefined;

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
  latitude?: number;
  longitude?: number;
  progress?: number;
  notes?: string;
  customer?: Ref;
  projectManager?: Ref;
  projectEngineer?: Ref;
}

const refId = (r: Ref) => (typeof r === "string" ? r : r?._id ?? "");
const refName = (r: Ref) => (typeof r === "object" && r ? r.companyName ?? "" : "");
const label = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function toForm(p?: ProjectInput | null) {
  return {
    projectId: p?.projectId ?? "",
    name: p?.name ?? "",
    customerName: refName(p?.customer),
    projectType: p?.projectType ?? "",
    description: p?.description ?? "",
    startDate: p?.startDate?.slice(0, 10) ?? "",
    expectedCompletionDate: p?.expectedCompletionDate?.slice(0, 10) ?? "",
    status: p?.status ?? "draft",
    priority: p?.priority ?? "medium",
    budget: p?.budget != null ? String(p.budget) : "",
    location: p?.location ?? "",
    latitude: p?.latitude != null ? String(p.latitude) : "",
    longitude: p?.longitude != null ? String(p.longitude) : "",
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
  const [employees, setEmployees] = useState<Option[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [materials, setMaterials] = useState<ExpectedItem[]>([]);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const editing = Boolean(project?._id);
  const projectId = project?._id ?? createdId;

  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const key = open ? project?._id ?? "new" : null;
  if (key !== openedFor) {
    setOpenedFor(key);
    if (key) {
      setForm(toForm(project));
      setError("");
      setMaterials([]);
      setCreatedId(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    apiFetch("/api/employees?limit=100&sort=name").then((j) => j.success && setEmployees(j.data));
    if (project?._id)
      apiFetch(`/api/projects/${project._id}/materials`).then(
        (j) =>
          j.success &&
          setMaterials(
            (j.data as { product: ExpectedItem["product"]; planned: number }[])
              .filter((r) => r.product)
              .map((r) => ({ product: r.product, planned: String(r.planned) }))
          )
      );
  }, [open, project?._id]);

  const set = (k: keyof ReturnType<typeof toForm>) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // Paste "lat, lng" (e.g. from Google Maps) into either coordinate field and it fills both.
  function handleCoordPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    const parts = text.split(",").map((p) => p.trim());
    if (parts.length !== 2) return;
    const [lat, lng] = parts;
    if (Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) return;
    e.preventDefault();
    setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
  }

  async function save() {
    if (!form.name.trim() || !form.customerName.trim()) {
      setError("Name and customer are required.");
      return;
    }
    if ((form.latitude && !form.longitude) || (form.longitude && !form.latitude)) {
      setError("Enter both latitude and longitude, or leave both blank.");
      return;
    }
    const progress = Number(form.progress || 0);
    if (progress < 0 || progress > 100) {
      setError("Progress must be between 0 and 100.");
      return;
    }
    if (materials.some((m) => !(Number(m.planned) > 0))) {
      setError("Enter an expected quantity for every material, or remove it.");
      return;
    }
    setSaving(true);
    setError("");

    // Resolve the typed customer name to an id — reuse an exact-name match if one exists,
    // otherwise create a new customer record on the fly.
    const typedName = form.customerName.trim();
    let customerId = form.customer;
    if (!customerId || refName(project?.customer) !== typedName) {
      const existing = await apiFetch(`/api/customers?search=${encodeURIComponent(typedName)}&limit=5`);
      const match = existing.success
        ? (existing.data as Option[]).find((c) => c.companyName?.toLowerCase() === typedName.toLowerCase())
        : null;
      if (match) {
        customerId = match._id;
      } else {
        const cRes = await apiPost("/api/customers", { companyName: typedName });
        if (cRes.success === false) {
          setSaving(false);
          setError(cRes.error?.message ?? "Could not create the customer.");
          return;
        }
        customerId = cRes.data._id;
      }
    }

    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) if (v !== "") payload[k] = v;
    delete payload.projectId; // always server-generated — never sent from the client
    delete payload.customerName;
    payload.customer = customerId;
    payload.progress = progress;
    if (form.budget) payload.budget = Number(form.budget);
    if (form.latitude) payload.latitude = Number(form.latitude);
    if (form.longitude) payload.longitude = Number(form.longitude);

    const res = projectId ? await apiPatch(`/api/projects/${projectId}`, payload) : await apiPost("/api/projects", payload);
    if (res.success === false) {
      setSaving(false);
      setError(res.error?.message ?? "Could not save the project.");
      return;
    }
    const id: string = projectId ?? res.data?._id;
    if (!projectId) setCreatedId(id);

    const mat = await apiPut(`/api/projects/${id}/materials`, {
      items: materials.map((m) => ({ product: m.product._id, planned: Number(m.planned) })),
    });
    setSaving(false);
    if (mat.success === false) {
      setError(`Project saved, but the expected materials were not: ${mat.error?.message ?? "unknown error"}. Fix and save again.`);
      return;
    }
    onSaved(id);
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit project" : "New project"} maxWidth="max-w-3xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {editing ? (
          <FormInput label="Project ID" value={form.projectId} disabled className="opacity-70" />
        ) : (
          <div>
            <div className="label mb-1.5">Project ID</div>
            <div className="field flex items-center text-ink-400 select-none cursor-not-allowed">
              Generated automatically on save
            </div>
          </div>
        )}
        <FormInput label="Name" required value={form.name} onChange={set("name")} />
        <FormInput
          label="Customer"
          required
          value={form.customerName}
          onChange={set("customerName")}
          placeholder="Customer / company name"
        />
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
        <FormInput
          label="Latitude"
          value={form.latitude}
          onChange={set("latitude")}
          onPaste={handleCoordPaste}
          placeholder="Paste “lat, long” here"
        />
        <FormInput
          label="Longitude"
          value={form.longitude}
          onChange={set("longitude")}
          onPaste={handleCoordPaste}
          placeholder="Paste “lat, long” here"
        />
        <FormTextarea label="Description" value={form.description} onChange={set("description")} className="sm:col-span-2" />
      </div>
      <div className="mt-6 pt-5 border-t border-paper-200">
        <ExpectedMaterials items={materials} onChange={setMaterials} contractValue={form.budget ? Number(form.budget) : undefined} />
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
