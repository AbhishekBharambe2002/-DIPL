"use client";

import { Plus, Trash2 } from "lucide-react";
import { inr } from "@/lib/format";

export interface SkuOption {
  _id: string;
  sku: string;
  name: string;
  unit: string;
  purchasePrice?: number;
}

export interface LineDraft {
  product: string;
  quantity: string;
  rate: string;
  gstPercent: string;
}

export const blankLine = (): LineDraft => ({ product: "", quantity: "", rate: "", gstPercent: "18" });

export function lineTotals(lines: LineDraft[], withGst: boolean) {
  const taxable = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.rate) || 0), 0);
  const gst = withGst
    ? lines.reduce((s, l) => s + ((Number(l.quantity) || 0) * (Number(l.rate) || 0) * (Number(l.gstPercent) || 0)) / 100, 0)
    : 0;
  return { taxable, gst, total: taxable + gst };
}

export function LineEditor({
  lines,
  onChange,
  products,
  withGst = false,
}: {
  lines: LineDraft[];
  onChange: (lines: LineDraft[]) => void;
  products: SkuOption[];
  withGst?: boolean;
}) {
  const update = (i: number, patch: Partial<LineDraft>) => onChange(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const t = lineTotals(lines, withGst);
  const cell = "field !py-1.5 !text-[13px]";

  return (
    <div>
      <div className="label mb-1.5">Lines</div>
      <div className="border border-paper-200 overflow-x-auto">
        <table className="w-full min-w-[620px]">
          <thead>
            <tr>
              <th className="th">SKU</th>
              <th className="th w-24 text-right">Qty</th>
              <th className="th w-28 text-right">Rate ₹</th>
              {withGst && <th className="th w-20 text-right">GST %</th>}
              <th className="th w-28 text-right">Amount</th>
              <th className="th w-10" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const p = products.find((x) => x._id === l.product);
              return (
                <tr key={i}>
                  <td className="px-2 py-1.5">
                    <select
                      aria-label={`Line ${i + 1} SKU`}
                      className={cell}
                      value={l.product}
                      onChange={(e) => {
                        const np = products.find((x) => x._id === e.target.value);
                        update(i, { product: e.target.value, rate: l.rate || (np?.purchasePrice ? String(np.purchasePrice) : "") });
                      }}
                    >
                      <option value="">Select SKU</option>
                      {products.map((o) => (
                        <option key={o._id} value={o._id}>
                          {o.sku} · {o.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      aria-label={`Line ${i + 1} quantity`}
                      type="number"
                      min={0}
                      className={`${cell} text-right`}
                      value={l.quantity}
                      placeholder={p?.unit}
                      onChange={(e) => update(i, { quantity: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      aria-label={`Line ${i + 1} rate`}
                      type="number"
                      min={0}
                      step="0.01"
                      className={`${cell} text-right`}
                      value={l.rate}
                      onChange={(e) => update(i, { rate: e.target.value })}
                    />
                  </td>
                  {withGst && (
                    <td className="px-2 py-1.5">
                      <input
                        aria-label={`Line ${i + 1} GST`}
                        type="number"
                        min={0}
                        max={28}
                        className={`${cell} text-right`}
                        value={l.gstPercent}
                        onChange={(e) => update(i, { gstPercent: e.target.value })}
                      />
                    </td>
                  )}
                  <td className="px-2 py-1.5 text-right tnum text-[13px]">
                    {inr((Number(l.quantity) || 0) * (Number(l.rate) || 0))}
                  </td>
                  <td className="px-1 py-1.5 text-center">
                    <button
                      type="button"
                      aria-label={`Remove line ${i + 1}`}
                      disabled={lines.length === 1}
                      onClick={() => onChange(lines.filter((_, j) => j !== i))}
                      className="p-1.5 text-ink-400 hover:text-neg disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <button type="button" onClick={() => onChange([...lines, blankLine()])} className="btn-ghost !py-1 !px-2.5 !text-[12px]">
          <Plus className="h-3.5 w-3.5" /> Add line
        </button>
        <div className="text-right text-[13px] tnum space-y-0.5">
          {withGst && (
            <>
              <div className="text-ink-500">Taxable {inr(t.taxable)}</div>
              <div className="text-ink-500">GST {inr(t.gst)}</div>
            </>
          )}
          <div className="font-semibold text-ink-900">Total {inr(t.total)}</div>
        </div>
      </div>
    </div>
  );
}
