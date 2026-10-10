"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { AlertTriangle, ShoppingCart, FolderKanban, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/hooks/use-api";
import { qty } from "@/lib/format";

interface ProjectRef {
  _id: string;
  projectId: string;
  name: string;
}

interface LowStockItem {
  _id: string;
  productId: string;
  name: string;
  category: string;
  make?: string;
  size?: string;
  unit: string;
  minStock: number;
  quantity: number;
  rate: number;
  shortBy: number;
  projects: ProjectRef[];
}

function toRestockLine(i: LowStockItem) {
  return {
    material: i._id,
    productId: i.productId,
    name: i.name + (i.size ? ` · ${i.size}` : ""),
    unit: i.unit,
    quantity: i.shortBy,
    rate: i.rate,
  };
}

function LowStockRow({ i }: { i: LowStockItem }) {
  return (
    <div className="px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-ink-900 truncate">
          {i.name}
          {i.size && <span className="text-ink-400"> · {i.size}</span>}
        </div>
        <div className="text-[11.5px] text-ink-400">
          {i.productId} · {qty(i.quantity, i.unit)} on hand · min {qty(i.minStock, i.unit)}
        </div>
      </div>
      <span className="shrink-0 text-[12px] font-semibold tabular-nums text-neg whitespace-nowrap">
        −{i.shortBy} {i.unit}
      </span>
    </div>
  );
}

export function LowStockAlertBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [groupByProject, setGroupByProject] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  function load() {
    apiFetch("/api/materials/low-stock").then((j) => {
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

  const count = items.length;

  // Group items by every project they've been dispatched to; items never sent to any
  // project (general warehouse stock) fall into a "General stock" bucket.
  const groups = useMemo(() => {
    const byProject = new Map<string, { project: ProjectRef | null; items: LowStockItem[] }>();
    for (const i of items) {
      if (i.projects.length === 0) {
        const bucket = byProject.get("__general") ?? { project: null, items: [] };
        bucket.items.push(i);
        byProject.set("__general", bucket);
      } else {
        for (const p of i.projects) {
          const bucket = byProject.get(p._id) ?? { project: p, items: [] };
          bucket.items.push(i);
          byProject.set(p._id, bucket);
        }
      }
    }
    return [...byProject.values()].sort((a, b) => b.items.length - a.items.length);
  }, [items]);

  function orderShortfall(targets: LowStockItem[], project?: ProjectRef | null) {
    const restock = targets.map(toRestockLine);
    const params = new URLSearchParams({ restock: JSON.stringify(restock) });
    if (project) {
      params.set("destination", "project");
      params.set("project", project._id);
    }
    router.push(`/procurement/new?${params.toString()}`);
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex items-center justify-center h-9 w-9 border border-paper-300 bg-paper-50 text-ink-600 hover:text-ink-900 hover:bg-paper-100 transition-colors"
        aria-label="Low stock alerts"
      >
        <AlertTriangle className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-warn text-ink-950 text-[10px] font-semibold tabular-nums">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[400px] max-h-[32rem] overflow-y-auto card shadow-lg divide-y divide-paper-200">
          <div className="px-4 py-2.5 border-b border-paper-200 flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-ink-900">Low stock</span>
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] text-ink-400">{count} below minimum</span>
              {count > 0 && (
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => setGroupByProject(false)}
                    aria-label="Flat list"
                    title="Flat list"
                    className={clsx(
                      "p-1 border transition-colors",
                      !groupByProject ? "bg-ink-900 text-paper-50 border-ink-900" : "border-paper-300 text-ink-500 hover:text-ink-900"
                    )}
                  >
                    <List className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupByProject(true)}
                    aria-label="Group by project"
                    title="Group by project"
                    className={clsx(
                      "p-1 border transition-colors",
                      groupByProject ? "bg-ink-900 text-paper-50 border-ink-900" : "border-paper-300 text-ink-500 hover:text-ink-900"
                    )}
                  >
                    <FolderKanban className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {count === 0 ? (
            <div className="px-4 py-8 text-center text-[12.5px] text-ink-400">Everything is above its minimum stock.</div>
          ) : !groupByProject ? (
            <>
              {items.slice(0, 20).map((i) => (
                <LowStockRow key={i._id} i={i} />
              ))}
              {count > 20 && <div className="px-4 py-2 text-center text-[11.5px] text-ink-400">+ {count - 20} more below minimum</div>}
              <div className="px-4 py-3">
                <Button size="sm" className="w-full" onClick={() => orderShortfall(items)}>
                  <ShoppingCart className="h-3.5 w-3.5" /> Order the shortfall ({count})
                </Button>
              </div>
            </>
          ) : (
            groups.map((g) => (
              <div key={g.project?._id ?? "general"}>
                <div className="px-4 py-2 bg-paper-100/80 flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-ink-900 truncate">
                    {g.project ? g.project.name : "General stock"}
                  </span>
                  <span className="text-[11px] text-ink-400 shrink-0">{g.items.length} short</span>
                </div>
                {g.items.map((i) => (
                  <LowStockRow key={i._id} i={i} />
                ))}
                <div className="px-4 py-2.5">
                  <Button size="sm" variant="secondary" className="w-full" onClick={() => orderShortfall(g.items, g.project)}>
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Order shortfall for {g.project ? g.project.name : "general stock"} ({g.items.length})
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
