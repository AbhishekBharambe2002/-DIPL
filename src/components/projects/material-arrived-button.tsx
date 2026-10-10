"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PackageCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch, apiPatch } from "@/hooks/use-api";
import { qty, shortDate } from "@/lib/format";

interface PendingDispatch {
  _id: string;
  productId: string;
  quantity: number;
  date: string;
  material?: { name: string; size?: string; unit: string };
}

/**
 * Materials dispatched to this project that are still "in transit" — stock
 * already left the warehouse, but Allocated only counts them once someone
 * here confirms they actually arrived at site.
 */
export function MaterialArrivedButton({ projectId, onArrived }: { projectId: string; onArrived: () => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PendingDispatch[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    apiFetch(`/api/dispatches/pending?project=${projectId}`).then((j) => {
      if (j.success) setItems(j.data.items);
    });
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function confirm(id: string) {
    setConfirming(id);
    const res = await apiPatch(`/api/dispatches/${id}/deliver`, {});
    setConfirming(null);
    if (res.success === false) return;
    load();
    onArrived();
  }

  const count = items.length;
  if (count === 0) return null;

  return (
    <div className="relative" ref={boxRef}>
      <Button variant="secondary" size="sm" onClick={() => setOpen((o) => !o)}>
        <Truck className="h-3.5 w-3.5" /> Material arrived
        <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-warn text-paper-50 text-[10px] font-semibold tabular-nums">
          {count}
        </span>
      </Button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[360px] max-h-[22rem] overflow-y-auto card shadow-lg divide-y divide-paper-200">
          <div className="px-4 py-2.5 border-b border-paper-200 text-[13px] font-semibold text-ink-900">
            In transit to this site
          </div>
          {items.map((d) => (
            <div key={d._id} className="px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-ink-900 truncate">
                  {d.material?.name ?? d.productId}
                  {d.material?.size && <span className="text-ink-400"> · {d.material.size}</span>}
                </div>
                <div className="text-[11.5px] text-ink-400">
                  {qty(d.quantity, d.material?.unit ?? "")} · dispatched {shortDate(d.date)}
                </div>
              </div>
              <Button size="sm" onClick={() => confirm(d._id)} disabled={confirming === d._id}>
                <PackageCheck className="h-3.5 w-3.5" /> {confirming === d._id ? "…" : "Arrived"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
