"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { AlertTriangle, Search, Trash2, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { apiFetch, apiPost } from "@/hooks/use-api";
import { inr, qty } from "@/lib/format";

export interface RequirementMaterial {
  productId: string; // the underlying Material _id (the 393-item catalogue, what dispatch actually moves)
  sku: string;
  name: string;
  unit: string;
  rate: number;
}

interface Line {
  productId: string;
  sku: string;
  name: string;
  unit: string;
  quantity: string;
  rate: string;
}

/**
 * "Add material requirement" — pick any number of this project's own
 * Expected Materials (nothing outside that list) and say how much of each is
 * needed. This only raises the requirement; it shows up on the Dispatches
 * page as "requested" and stock doesn't actually leave the warehouse until
 * someone dispatches it from there.
 */
export function RequirementModal({
  open,
  onClose,
  projectId,
  materials,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  materials: RequirementMaterial[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [stock, setStock] = useState<Record<string, { qty: number }>>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    apiFetch("/api/materials?limit=500").then(
      (j) => j.success && setStock(Object.fromEntries(j.data.map((m: { _id: string; available: number }) => [m._id, { qty: m.available }])))
    );
  }, [open]);

  // reset when the dialog is reopened
  const [openedWith, setOpenedWith] = useState(false);
  if (open !== openedWith) {
    setOpenedWith(open);
    if (open) {
      setLines([]);
      setSearch("");
      setError("");
      setDropdownOpen(false);
    }
  }

  const q = search.trim().toLowerCase();
  const results = q
    ? materials.filter((m) => !lines.some((l) => l.productId === m.productId) && (m.name.toLowerCase().includes(q) || m.sku.toLowerCase().includes(q)))
    : materials.filter((m) => !lines.some((l) => l.productId === m.productId));

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function addLine(m: RequirementMaterial) {
    setLines((prev) => [...prev, { productId: m.productId, sku: m.sku, name: m.name, unit: m.unit, quantity: "1", rate: String(m.rate || "") }]);
    setSearch("");
    setHighlighted(0);
    setError("");
    // stays open so the next material can be picked straight away
  }

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, j) => j !== i));
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
      if (results[highlighted]) addLine(results[highlighted]);
    } else if (e.key === "Escape") {
      setDropdownOpen(false);
    }
  }

  const total = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.rate) || 0), 0),
    [lines]
  );
  const shortCount = useMemo(
    () => lines.filter((l) => (Number(l.quantity) || 0) > (stock[l.productId]?.qty ?? 0)).length,
    [lines, stock]
  );

  async function submitRequirement() {
    if (lines.length === 0) return setError("Add at least one material.");
    if (lines.some((l) => !(Number(l.quantity) > 0)))
      return setError("Every line needs a quantity above zero.");

    setSubmitting(true);
    setError("");
    for (const l of lines) {
      const res = await apiPost(`/api/projects/${projectId}/dispatch`, {
        material: l.productId,
        quantity: Number(l.quantity),
        requestOnly: true,
      });
      if (res.success === false) {
        setSubmitting(false);
        return setError(`${l.name}: ${res.error?.message ?? "could not add"}`);
      }
    }
    setSubmitting(false);
    onClose();
    router.push("/dispatches");
  }

  return (
    <Modal open={open} onClose={onClose} title="Add material requirement" maxWidth="max-w-xl">
      <p className="text-[12.5px] text-ink-500 mb-4">
        Only materials already in this project&apos;s Expected Materials can be requested here.
      </p>

      {materials.length === 0 ? (
        <p className="text-[13px] text-ink-400">
          No expected materials yet — add some from &ldquo;Expected materials&rdquo; first.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="relative" ref={boxRef}>
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder="Search material to add…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlighted(0);
              }}
              onFocus={() => {
                setDropdownOpen(true);
                setHighlighted(0);
              }}
              onKeyDown={handleKeyDown}
              className="field !pl-8 !pr-8"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {dropdownOpen && results.length > 0 && (
              <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto card divide-y divide-paper-200 shadow-lg">
                {results.map((m, i) => (
                  <button
                    key={m.productId}
                    type="button"
                    onClick={() => addLine(m)}
                    onMouseEnter={() => setHighlighted(i)}
                    className={clsx(
                      "w-full text-left px-3 py-2 flex items-center justify-between gap-3 transition-colors",
                      i === highlighted ? "bg-paper-200/80" : "hover:bg-paper-100"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-ink-900 truncate">{m.name}</div>
                      <div className="text-[11.5px] text-ink-400 font-mono">{m.sku}</div>
                    </div>
                    <div className="text-right shrink-0 text-[12px]">
                      <div className="tnum text-ink-700">{qty(stock[m.productId]?.qty ?? 0, m.unit)} in stock</div>
                      <div className="tnum text-ink-500">{m.rate ? inr(m.rate) : "no rate"}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {dropdownOpen && search && results.length === 0 && (
              <div className="absolute z-10 mt-1 w-full card px-3 py-3 text-center text-[12.5px] text-ink-400 shadow-lg">
                No expected materials match “{search.trim()}”.
              </div>
            )}
          </div>

          {lines.length === 0 ? (
            <p className="text-[12.5px] text-ink-400 text-center py-4 border border-dashed border-paper-300">
              Search above and add materials to this requirement.
            </p>
          ) : (
            <div className="border border-paper-200 overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr>
                    <th className="th">Material</th>
                    <th className="th text-right">Stock</th>
                    <th className="th w-24 text-right">Qty</th>
                    <th className="th w-24 text-right">Rate</th>
                    <th className="th w-24 text-right">Amount</th>
                    <th className="th w-10" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => {
                    const stockQty = stock[l.productId]?.qty ?? 0;
                    const short = Math.max(0, (Number(l.quantity) || 0) - stockQty);
                    return (
                    <tr key={l.productId}>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          {short > 0 && (
                            <AlertTriangle
                              className="h-3.5 w-3.5 text-warn shrink-0"
                              aria-label={`Short by ${short} ${l.unit} — will need to be ordered`}
                            />
                          )}
                          <div>
                            <div className="text-[12.5px] text-ink-900">{l.name}</div>
                            <div className="text-[11px] text-ink-400 font-mono">{l.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <div className="tnum text-[12.5px] text-ink-500">{qty(stockQty, l.unit)}</div>
                        {short > 0 && <div className="tnum text-[10.5px] font-semibold text-warn whitespace-nowrap">−{short} short</div>}
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min={0}
                          value={l.quantity}
                          onChange={(e) => updateLine(i, { quantity: e.target.value })}
                          className={clsx(
                            "field !py-1.5 !text-[12.5px] text-right",
                            !(Number(l.quantity) > 0) ? "!border-neg" : short > 0 && "!border-warn"
                          )}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={l.rate}
                          onChange={(e) => updateLine(i, { rate: e.target.value })}
                          className="field !py-1.5 !text-[12.5px] text-right"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right tnum text-[12.5px] font-medium">
                        {inr((Number(l.quantity) || 0) * (Number(l.rate) || 0))}
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        <button type="button" onClick={() => removeLine(i)} className="p-1.5 text-ink-400 hover:text-neg" aria-label={`Remove ${l.name}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-3 py-2 border-t border-paper-200 text-[13px]">
                {shortCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-warn">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {shortCount} item{shortCount === 1 ? "" : "s"} short of current stock
                  </span>
                ) : (
                  <span />
                )}
                <span className="font-semibold text-ink-900 tnum">Total {inr(total)}</span>
              </div>
            </div>
          )}

          {error && <p className="text-[12.5px] text-neg">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submitRequirement} disabled={lines.length === 0 || submitting}>
              {submitting ? "Adding…" : "Add requirement"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
