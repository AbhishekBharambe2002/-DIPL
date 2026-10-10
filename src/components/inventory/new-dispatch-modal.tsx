"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Search, Send, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-field";
import { apiFetch, apiPost } from "@/hooks/use-api";
import { inr, qty } from "@/lib/format";

interface ProjectOption {
  _id: string;
  projectId: string;
  name: string;
}

interface MaterialOption {
  _id: string;
  productId: string;
  name: string;
  size?: string;
  unit: string;
  available: number; // quantityToDispatch — what's actually left to send out
  purchasePrice: number;
}

/**
 * Dispatch a material straight out of inventory to a project site — the real
 * action, not a history view. Decrements the material's available stock and
 * logs a "dispatch" entry against the chosen project.
 */
export function NewDispatchModal({
  open,
  onClose,
  onDispatched,
  initialProjectId,
  lockedProjectName,
}: {
  open: boolean;
  onClose: () => void;
  onDispatched: () => void;
  /** pre-selects the project, e.g. when opened from that project's own view */
  initialProjectId?: string;
  /** when set, the project is fixed — no picker shown, no "where to deliver" question */
  lockedProjectName?: string;
}) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState(initialProjectId ?? "");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<MaterialOption[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const [picked, setPicked] = useState<MaterialOption | null>(null);
  const [quantity, setQuantity] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  const [openedWith, setOpenedWith] = useState(false);
  if (open !== openedWith) {
    setOpenedWith(open);
    if (open) {
      setProjectId(initialProjectId ?? "");
      setSearch("");
      setResults([]);
      setPicked(null);
      setQuantity("");
      setError("");
    }
  }

  useEffect(() => {
    if (!open) return;
    apiFetch("/api/projects?limit=200&sort=name").then((j) => j.success && setProjects(j.data));
  }, [open]);

  useEffect(() => {
    if (!search.trim()) {
      queueMicrotask(() => setResults([]));
      return;
    }
    const t = setTimeout(() => {
      apiFetch(`/api/materials?search=${encodeURIComponent(search.trim())}&limit=10`).then((j) => {
        if (j.success) {
          setResults(j.data);
          setHighlighted(0);
        }
      });
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setResults([]);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function pick(m: MaterialOption) {
    setPicked(m);
    setSearch("");
    setResults([]);
    setQuantity("");
    setError("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[highlighted]) pick(results[highlighted]);
    } else if (e.key === "Escape") {
      setResults([]);
    }
  }

  async function dispatch() {
    if (!projectId) return setError("Choose a project.");
    if (!picked) return setError("Choose a material.");
    const qtyNum = Number(quantity);
    if (!(qtyNum > 0)) return setError("Enter a quantity above zero.");
    if (qtyNum > picked.available) return setError(`Only ${picked.available} ${picked.unit} available in inventory.`);

    setSending(true);
    setError("");
    const res = await apiPost(`/api/projects/${projectId}/dispatch`, { material: picked._id, quantity: qtyNum });
    setSending(false);
    if (res.success === false) {
      setError(res.error?.message ?? "Could not dispatch the material.");
      return;
    }
    onDispatched();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Dispatch material" maxWidth="max-w-lg">
      <p className="text-[12.5px] text-ink-500 mb-4">Sends material straight out of inventory to a project site — stock is deducted immediately.</p>

      <div className="space-y-4">
        {lockedProjectName ? (
          <div className="rounded border border-paper-200 bg-paper-100/60 px-3 py-2 text-[13px] text-ink-700">
            Dispatching to <span className="font-medium text-ink-900">{lockedProjectName}</span>
          </div>
        ) : (
          <FormSelect label="Project" required value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Select project</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </FormSelect>
        )}

        <div className="relative" ref={boxRef}>
          <div className="label mb-1.5">Material</div>
          {picked ? (
            <div className="field flex items-center justify-between !py-1.5">
              <div className="min-w-0">
                <span className="text-[13px] text-ink-900">{picked.name}</span>
                {picked.size && <span className="text-ink-400 text-[12px]"> · {picked.size}</span>}
                <span className="ml-2 text-[11px] text-ink-400 tnum">{qty(picked.available, picked.unit)} available</span>
              </div>
              <button type="button" onClick={() => setPicked(null)} className="text-ink-400 hover:text-neg shrink-0" aria-label="Change material">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Search material to dispatch…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="field !pl-8"
              />
            </div>
          )}

          {!picked && results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto card divide-y divide-paper-200 shadow-lg">
              {results.map((m, i) => (
                <button
                  key={m._id}
                  type="button"
                  onClick={() => pick(m)}
                  onMouseEnter={() => setHighlighted(i)}
                  className={clsx(
                    "w-full text-left px-3 py-2 flex items-center justify-between gap-3 transition-colors",
                    i === highlighted ? "bg-paper-200/80" : "hover:bg-paper-100"
                  )}
                >
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-ink-900 truncate">{m.name}</div>
                    <div className="text-[11.5px] text-ink-400">
                      {m.productId}
                      {m.size && ` · ${m.size}`}
                    </div>
                  </div>
                  <div className="text-right shrink-0 text-[12px]">
                    <div className={clsx("tnum", m.available > 0 ? "text-ink-700" : "text-neg")}>{qty(m.available, m.unit)} avail.</div>
                    <div className="tnum text-ink-500">{m.purchasePrice ? inr(m.purchasePrice) : "no rate"}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {!picked && search.trim() && results.length === 0 && (
            <div className="absolute z-10 mt-1 w-full card px-3 py-3 text-center text-[12.5px] text-ink-400 shadow-lg">
              No materials match “{search.trim()}”.
            </div>
          )}
        </div>

        {picked && (
          <div className="relative w-32">
            <div className="label mb-1.5">Quantity</div>
            <input
              type="number"
              min={0}
              placeholder={picked.unit}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="field text-right"
              autoFocus
            />
          </div>
        )}

        {error && <p className="text-[12.5px] text-neg">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={dispatch} disabled={sending}>
            <Send className="h-3.5 w-3.5" /> {sending ? "Dispatching…" : "Dispatch"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
