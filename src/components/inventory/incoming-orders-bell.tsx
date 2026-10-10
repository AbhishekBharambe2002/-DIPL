"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Bell, CheckCircle2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Meter } from "@/components/ui/status-badge";
import { apiFetch, apiPatch } from "@/hooks/use-api";
import { inr, qty, shortDate } from "@/lib/format";

interface OrderLine {
  material: string;
  productId: string;
  name: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface IncomingOrder {
  _id: string;
  orderNo: string;
  vendor?: { vendorName: string };
  lines: OrderLine[];
  totalAmount: number;
  expectedDate: string;
  createdAt: string;
  status: string;
}

/** How close an order is to its expected delivery date. */
function deliveryProgress(order: IncomingOrder) {
  const ordered = new Date(order.createdAt).getTime();
  const expected = new Date(order.expectedDate).getTime();
  const now = Date.now();
  const span = expected - ordered;
  const pct = span > 0 ? Math.min(100, Math.max(0, ((now - ordered) / span) * 100)) : 100;
  const daysLeft = Math.ceil((expected - now) / 86_400_000);
  const overdue = now > expected;

  let label: string;
  let tone: "brand" | "warn" | "neg";
  if (overdue) {
    label = `Overdue by ${Math.abs(daysLeft)}d`;
    tone = "neg";
  } else if (daysLeft === 0) {
    label = "Arriving today";
    tone = "warn";
  } else if (daysLeft <= 2) {
    label = `Arriving in ${daysLeft}d`;
    tone = "warn";
  } else {
    label = `Arriving in ${daysLeft}d`;
    tone = "brand";
  }
  return { pct: overdue ? 100 : pct, label, tone };
}

export function IncomingOrdersBell({ onDelivered }: { onDelivered?: () => void }) {
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<IncomingOrder[]>([]);
  const [confirmOrder, setConfirmOrder] = useState<IncomingOrder | null>(null);
  const [delivering, setDelivering] = useState(false);
  const [deliverError, setDeliverError] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  function load() {
    apiFetch("/api/primary-orders?destination=inventory&status=placed&sort=expectedDate&limit=50").then((j) => {
      if (j.success) setOrders(j.data);
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

  async function confirmDelivery() {
    if (!confirmOrder) return;
    setDelivering(true);
    setDeliverError("");
    const res = await apiPatch(`/api/primary-orders/${confirmOrder._id}/deliver`, {});
    setDelivering(false);
    if (res.success === false) {
      setDeliverError(res.error?.message ?? "Could not confirm delivery.");
      return;
    }
    setConfirmOrder(null);
    load();
    onDelivered?.();
  }

  const count = orders.length;

  return (
    <>
      <div className="relative" ref={boxRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="relative inline-flex items-center justify-center h-9 w-9 border border-paper-300 bg-paper-50 text-ink-600 hover:text-ink-900 hover:bg-paper-100 transition-colors"
          aria-label="Incoming orders"
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
              <span className="text-[13px] font-semibold text-ink-900">Incoming orders</span>
              <span className="text-[11.5px] text-ink-400">{count} pending</span>
            </div>
            {count === 0 ? (
              <div className="px-4 py-8 text-center text-[12.5px] text-ink-400">
                Nothing on order right now.
              </div>
            ) : (
              orders.map((o) => {
                const { pct, label, tone } = deliveryProgress(o);
                return (
                  <div key={o._id} className="px-4 py-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-ink-900 truncate">
                          {o.vendor?.vendorName ?? "Vendor"}
                        </div>
                        <div className="text-[11.5px] text-ink-400">
                          {o.orderNo} · {o.lines.length} item{o.lines.length === 1 ? "" : "s"} · {inr(o.totalAmount)}
                        </div>
                      </div>
                      <span
                        className={clsx(
                          "shrink-0 text-[11px] font-medium whitespace-nowrap",
                          tone === "neg" && "text-neg",
                          tone === "warn" && "text-warn",
                          tone === "brand" && "text-ink-500"
                        )}
                      >
                        {label}
                      </span>
                    </div>
                    <Meter pct={pct} tone={tone} />
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <span className="text-[11px] text-ink-400">Expected {shortDate(o.expectedDate)}</span>
                      <Button size="sm" variant="secondary" onClick={() => setConfirmOrder(o)}>
                        <Truck className="h-3.5 w-3.5" /> Delivered
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── Confirm delivery modal ── */}
      <Modal
        open={!!confirmOrder}
        onClose={() => !delivering && setConfirmOrder(null)}
        title="Confirm delivery"
        maxWidth="max-w-xl"
      >
        {confirmOrder && (
          <div className="space-y-4">
            <p className="text-[13px] text-ink-500">
              Review order <span className="font-medium text-ink-900">{confirmOrder.orderNo}</span> from{" "}
              <span className="font-medium text-ink-900">{confirmOrder.vendor?.vendorName}</span> before adding it
              to inventory.
            </p>

            <div className="border border-paper-200 overflow-x-auto">
              <table className="w-full min-w-[420px]">
                <thead>
                  <tr>
                    <th className="th">Material</th>
                    <th className="th w-20 text-right">Qty</th>
                    <th className="th w-24 text-right">Rate</th>
                    <th className="th w-24 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {confirmOrder.lines.map((l) => (
                    <tr key={l.material}>
                      <td className="px-2 py-1.5 text-[13px] text-ink-900">{l.name}</td>
                      <td className="px-2 py-1.5 text-right tnum text-[13px]">{qty(l.quantity, l.unit)}</td>
                      <td className="px-2 py-1.5 text-right tnum text-[13px]">{inr(l.rate)}</td>
                      <td className="px-2 py-1.5 text-right tnum text-[13px] font-medium">{inr(l.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end px-3 py-2 border-t border-paper-200 text-[13px]">
                <span className="font-semibold text-ink-900 tnum">Total {inr(confirmOrder.totalAmount)}</span>
              </div>
            </div>

            <p className="text-[12px] text-ink-400">Expected {shortDate(confirmOrder.expectedDate)}</p>

            {deliverError && <p className="text-[13px] text-neg">{deliverError}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmOrder(null)} disabled={delivering}>
                Cancel
              </Button>
              <Button onClick={confirmDelivery} disabled={delivering}>
                <CheckCircle2 className="h-4 w-4" />
                {delivering ? "Adding to inventory…" : "Approve & add to inventory"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
