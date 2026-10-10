"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { PackageSearch, Search, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/hooks/use-api";
import { inr, qty } from "@/lib/format";

export interface PickerSku {
  _id: string;
  sku: string;
  name: string;
  unit: string;
  purchasePrice?: number;
  category?: string;
  available?: number; // current stock — present on items already resolved by the server
}

export interface ExpectedItem {
  product: PickerSku;
  planned: string;
}

/** stock remaining after taking this expected qty out — null while the qty field is empty */
function stockDelta(stockQty: number, planned: string) {
  const n = Number(planned);
  if (!planned || !(n >= 0)) return null;
  return stockQty - n;
}

/** live "+29 left" / "−15 short" readout next to a quantity input */
function DeltaTag({ delta, unit }: { delta: number | null; unit: string }) {
  if (delta === null) return null;
  if (delta < 0) {
    return (
      <span className="text-[10.5px] font-semibold tabular-nums text-neg whitespace-nowrap" title="Not enough in stock — order the shortfall">
        {delta} short
      </span>
    );
  }
  return (
    <span className="text-[10.5px] font-semibold tabular-nums text-pos whitespace-nowrap" title={`${delta} ${unit} left in stock after this`}>
      +{delta} left
    </span>
  );
}

function ProductPicker({
  open,
  initial,
  onClose,
  onDone,
}: {
  open: boolean;
  initial: ExpectedItem[];
  onClose: () => void;
  onDone: (items: ExpectedItem[]) => void;
}) {
  const [products, setProducts] = useState<PickerSku[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  const [openedWith, setOpenedWith] = useState<ExpectedItem[] | null>(null);
  if (open && openedWith !== initial) {
    setOpenedWith(initial);
    setPicked(Object.fromEntries(initial.map((i) => [i.product._id, i.planned])));
    setSearch("");
    setCategory("");
  }

  useEffect(() => {
    if (!open || loaded) return;
    Promise.all([apiFetch("/api/materials?limit=500&sort=name"), apiFetch("/api/materials?summary=true")]).then(([p, s]) => {
      if (p.success)
        setProducts(
          p.data.map((m: { _id: string; productId: string; name: string; unit: string; purchasePrice: number; category: string; available?: number; quantity?: number }) => ({
            _id: m._id,
            sku: m.productId,
            name: m.name,
            unit: m.unit,
            purchasePrice: m.purchasePrice,
            category: m.category,
            available: m.available ?? m.quantity ?? 0,
          }))
        );
      if (s.success) setCategories(s.data.categories ?? []);
      setLoaded(true);
    });
  }, [open, loaded]);

  const q = search.trim().toLowerCase();
  const shown = products.filter(
    (p) => (!category || p.category === category) && (!q || p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
  );
  const selectedIds = Object.keys(picked);
  const estimate = selectedIds.reduce((s, id) => s + (Number(picked[id]) || 0) * (products.find((p) => p._id === id)?.purchasePrice ?? 0), 0);

  function toggle(p: PickerSku) {
    setPicked((cur) => {
      const next = { ...cur };
      if (p._id in next) delete next[p._id];
      else next[p._id] = "";
      return next;
    });
  }

  function done() {
    onDone(
      selectedIds
        .map((id) => ({ product: products.find((p) => p._id === id) ?? initial.find((i) => i.product._id === id)?.product, planned: picked[id] }))
        .filter((i): i is ExpectedItem => !!i.product)
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Choose from material catalogue" maxWidth="max-w-4xl">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            autoFocus
            type="text"
            placeholder="Search code or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field !pl-8"
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="field sm:!w-56" aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 border border-paper-200 max-h-[50vh] overflow-auto">
        <table className="w-full min-w-[640px]">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="th w-10" />
              <th className="th">Material</th>
              <th className="th">Category</th>
              <th className="th text-right">Rate</th>
              <th className="th text-right">In stock</th>
              <th className="th w-32 text-right">Expected qty</th>
            </tr>
          </thead>
          <tbody>
            {!loaded &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="td">
                    <div className="h-3.5 w-2/3 bg-paper-200 animate-pulse" />
                  </td>
                </tr>
              ))}
            {loaded && shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[13px] text-ink-400">
                  No materials match.
                </td>
              </tr>
            )}
            {shown.map((p) => {
              const on = p._id in picked;
              return (
                <tr key={p._id} className={clsx("cursor-pointer", on ? "bg-brand-50" : "hover:bg-paper-100/80")} onClick={() => toggle(p)}>
                  <td className="td text-center">
                    <input type="checkbox" checked={on} readOnly aria-label={`Select ${p.sku}`} className="h-4 w-4 accent-ink-900 pointer-events-none" />
                  </td>
                  <td className="td">
                    <div className="text-[14px] font-medium text-ink-900">{p.name}</div>
                    <div className="font-mono text-[11px] text-ink-400">{p.sku}</div>
                  </td>
                  <td className="td text-[12px] text-ink-500">{p.category || "—"}</td>
                  <td className="tdn">{p.purchasePrice ? inr(p.purchasePrice) : "—"}</td>
                  <td className="tdn text-ink-500">{qty(p.available ?? 0, p.unit)}</td>
                  <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number"
                      min={0}
                      aria-label={`Expected quantity of ${p.sku}`}
                      placeholder={p.unit}
                      value={picked[p._id] ?? ""}
                      onChange={(e) => setPicked({ ...picked, [p._id]: e.target.value })}
                      className="field !py-1.5 text-right"
                    />
                    <div className="mt-1 text-right">
                      <DeltaTag delta={stockDelta(p.available ?? 0, picked[p._id] ?? "")} unit={p.unit} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] text-ink-600">
          <span className="font-semibold text-ink-900">{selectedIds.length}</span> selected · estimated material{" "}
          <span className="tnum font-semibold text-ink-900">{inr(estimate)}</span>
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={done}>Use {selectedIds.length} material{selectedIds.length === 1 ? "" : "s"}</Button>
        </div>
      </div>
    </Modal>
  );
}

export function ExpectedMaterials({
  items,
  onChange,
  contractValue,
}: {
  items: ExpectedItem[];
  onChange: (items: ExpectedItem[]) => void;
  /** Contract value entered on the project — if the estimated material cost exceeds this, the total shows in red. */
  contractValue?: number;
}) {
  const [picking, setPicking] = useState(false);
  const total = useMemo(() => items.reduce((s, i) => s + (Number(i.planned) || 0) * (i.product.purchasePrice ?? 0), 0), [items]);
  const overBudget = !!contractValue && total > contractValue;

  return (
    <div>
      <div className="flex items-end justify-between gap-3 mb-1.5">
        <div>
          <div className="label">Expected materials</div>
          <p className="text-[12px] text-ink-500 mt-0.5">What this job will need, picked from the material catalogue.</p>
        </div>
        <button type="button" onClick={() => setPicking(true)} className="btn-ghost !py-1.5 !px-3 !text-[12.5px] shrink-0">
          <PackageSearch className="h-3.5 w-3.5" /> Choose from material catalogue
        </button>
      </div>

      {items.length === 0 ? (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="w-full border border-dashed border-paper-300 px-4 py-6 text-center text-[13px] text-ink-500 hover:bg-paper-100 hover:text-ink-900"
        >
          No materials yet — open the catalogue to add them.
        </button>
      ) : (
        <div className="border border-paper-200 overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr>
                <th className="th">Material</th>
                <th className="th w-32 text-right">Expected qty</th>
                <th className="th text-right">Rate</th>
                <th className="th text-right">Est. value</th>
                <th className="th w-10" />
              </tr>
            </thead>
            <tbody>
              {items.map((i, idx) => (
                <tr key={i.product._id}>
                  <td className="td">
                    <div className="text-[14px] font-medium text-ink-900">{i.product.name}</div>
                    <div className="font-mono text-[11px] text-ink-400">{i.product.sku}</div>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        aria-label={`Expected quantity of ${i.product.sku}`}
                        value={i.planned}
                        onChange={(e) => onChange(items.map((x, j) => (j === idx ? { ...x, planned: e.target.value } : x)))}
                        className={clsx("field !py-1.5 text-right", !(Number(i.planned) > 0) && "!border-neg")}
                      />
                      <span className="text-[11px] text-ink-400 w-8">{i.product.unit}</span>
                    </div>
                    <div className="mt-1 text-right">
                      <DeltaTag delta={stockDelta(i.product.available ?? 0, i.planned)} unit={i.product.unit} />
                    </div>
                  </td>
                  <td className="tdn">{i.product.purchasePrice ? inr(i.product.purchasePrice) : "—"}</td>
                  <td className={clsx("tdn font-medium", overBudget && "text-neg")}>
                    {inr((Number(i.planned) || 0) * (i.product.purchasePrice ?? 0))}
                  </td>
                  <td className="px-1 py-1.5 text-center">
                    <button
                      type="button"
                      aria-label={`Remove ${i.product.sku}`}
                      onClick={() => onChange(items.filter((_, j) => j !== idx))}
                      className="p-1.5 text-ink-400 hover:text-neg"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="td font-semibold" colSpan={3}>
                  {items.length} material{items.length === 1 ? "" : "s"} · estimated at current rates
                </td>
                <td className={clsx("tdn font-semibold", overBudget && "text-neg")}>{inr(total)}</td>
                <td />
              </tr>
              {!!contractValue && (
                <tr>
                  <td className="td text-ink-500" colSpan={3}>
                    Contract value
                  </td>
                  <td className="tdn text-ink-500">{inr(contractValue)}</td>
                  <td />
                </tr>
              )}
              {!!contractValue && (
                <tr>
                  <td className={clsx("td font-semibold", overBudget ? "text-neg" : "text-pos")} colSpan={3}>
                    Variance {overBudget ? "— over contract value" : "— within contract value"}
                  </td>
                  <td className={clsx("tdn font-semibold", overBudget ? "text-neg" : "text-pos")}>
                    {overBudget ? "−" : "+"}
                    {inr(Math.abs(contractValue - total))}
                  </td>
                  <td />
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      )}

      <ProductPicker
        open={picking}
        initial={items}
        onClose={() => setPicking(false)}
        onDone={(next) => {
          onChange(next);
          setPicking(false);
        }}
      />
    </div>
  );
}
