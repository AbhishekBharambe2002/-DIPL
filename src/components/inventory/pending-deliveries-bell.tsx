"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch, apiPatch } from "@/hooks/use-api";
import { inr, qty, shortDate } from "@/lib/format";

interface PendingDispatch {
  _id: string;
  productId: string;
  quantity: number;
  rate: number;
  value: number;
  date: string;
  project?: { _id: string; projectId: string; name: string };
  material?: { name: string; size?: string; make?: string; unit: string };
}

/**
 * Dispatches already out of the warehouse, waiting on site-delivery
 * confirmation — tap "Deliver" to add the quantity to that project's
 * Allocated total.
 */
export function PendingDeliveriesBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PendingDispatch[]>([]);
  const [delivering, setDelivering] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  function load() {
    apiFetch("/api/dispatches/pending").then((j) => {
      if (j.success) setItems(j.data.items);
    });
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function deliver(id: string) {
    setDelivering(id);
    const res = await apiPatch(`/api/dispatches/${id}/deliver`, {});
    setDelivering(null);
    if (res.success !== false) load();
  }

  const count = items.length;

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex items-center justify-center h-9 w-9 border border-paper-300 bg-paper-50 text-ink-600 hover:text-ink-900 hover:bg-paper-100 transition-colors"
        aria-label="Dispatches awaiting delivery"
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-neg text-paper-50 text-[10px] font-semibold tabular-nums">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[380px] max-h-[28rem] overflow-y-auto card shadow-lg divide-y divide-paper-200">
          <div className="px-4 py-2.5 border-b border-paper-200 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-ink-900">In transit to site</span>
            <span className="text-[11.5px] text-ink-400">{count} pending</span>
          </div>

          {count === 0 ? (
            <div className="px-4 py-8 text-center text-[12.5px] text-ink-400">Nothing dispatched is awaiting delivery.</div>
          ) : (
            items.map((d) => (
              <div key={d._id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-ink-900 truncate">
                    {d.material?.name ?? d.productId}
                    {d.material?.size && <span className="text-ink-400"> · {d.material.size}</span>}
                  </div>
                  <div className="text-[11.5px] text-ink-400">
                    {d.project?.name ?? "—"} · {qty(d.quantity, d.material?.unit ?? "")} · {inr(d.value)} · {shortDate(d.date)}
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => deliver(d._id)} disabled={delivering === d._id}>
                  <Truck className="h-3.5 w-3.5" /> {delivering === d._id ? "…" : "Deliver"}
                </Button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
