"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { FolderKanban, List, Plus, Search, Send, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { Chip } from "@/components/ui/status-badge";
import { NewDispatchModal } from "@/components/inventory/new-dispatch-modal";
import { MaterialArrivedButton } from "@/components/projects/material-arrived-button";
import { apiFetch, apiPatch } from "@/hooks/use-api";
import { inr, qty, shortDate } from "@/lib/format";

interface Dispatch {
  _id: string;
  productId: string;
  quantity: number;
  rate: number;
  value: number;
  date: string;
  note?: string;
  deliveryStatus?: "requested" | "in_transit" | "delivered";
  project?: { _id: string; projectId: string; name: string };
  material?: { _id: string; name: string; category: string; make?: string; size?: string; unit: string };
  createdBy?: { name: string };
}

interface DateGroup {
  key: string; // yyyy-mm-dd
  date: string;
  project?: Dispatch["project"];
  rows: Dispatch[];
  total: number;
}

export default function DispatchesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [selectedKey, setSelectedKey] = useState<{ date: string; projectKey: string } | null>(null);
  const [groupByProject, setGroupByProject] = useState(true);
  const [rows, setRows] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [sending, setSending] = useState(false);

  function load() {
    apiFetch("/api/dispatches?limit=100&sort=-date").then((j) => {
      if (j.success) setRows(j.data);
      setLoading(false);
    });
  }

  async function sendRequested(ids: string[]) {
    setSending(true);
    for (const id of ids) {
      await apiPatch(`/api/dispatches/${id}/send`, {});
    }
    setSending(false);
    load();
  }

  useEffect(() => {
    load();
  }, []);

  const q = searchInput.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      q
        ? rows.filter(
            (r) =>
              r.material?.name.toLowerCase().includes(q) ||
              r.productId.toLowerCase().includes(q) ||
              r.project?.name.toLowerCase().includes(q)
          )
        : rows,
    [rows, q]
  );

  // one row per calendar day — everything dispatched that day collapses together
  function byDate(items: Dispatch[]) {
    const map = new Map<string, DateGroup>();
    for (const r of items) {
      const day = r.date.slice(0, 10);
      const bucket = map.get(day) ?? { key: day, date: r.date, project: r.project, rows: [], total: 0 };
      bucket.rows.push(r);
      bucket.total += r.value;
      map.set(day, bucket);
    }
    return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
  }

  const projectGroups = useMemo(() => {
    const map = new Map<string, { project: Dispatch["project"]; rows: Dispatch[]; total: number }>();
    for (const r of filtered) {
      const key = r.project?._id ?? "unassigned";
      const bucket = map.get(key) ?? { project: r.project, rows: [], total: 0 };
      bucket.rows.push(r);
      bucket.total += r.value;
      map.set(key, bucket);
    }
    return [...map.values()]
      .sort((a, b) => b.total - a.total)
      .map((g) => ({ ...g, days: byDate(g.rows) }));
  }, [filtered]);

  const flatDays = useMemo(() => byDate(filtered), [filtered]);

  // derived from live data, not a frozen snapshot — so confirming an arrival
  // from inside the popup is reflected right there, no reopening needed
  const selectedDay = useMemo(() => {
    if (!selectedKey) return null;
    const days = groupByProject
      ? projectGroups.find((g) => (g.project?._id ?? "unassigned") === selectedKey.projectKey)?.days ?? []
      : flatDays;
    return days.find((d) => d.key === selectedKey.date && (d.project?._id ?? "unassigned") === selectedKey.projectKey) ?? null;
  }, [selectedKey, groupByProject, projectGroups, flatDays]);

  const dayColumns: Column<DateGroup>[] = [
    {
      key: "date",
      label: "Date",
      render: (g) => <span className="text-[12.5px] text-ink-900 font-medium whitespace-nowrap">{shortDate(g.date)}</span>,
    },
    ...(groupByProject
      ? []
      : [
          {
            key: "project",
            label: "Project",
            render: (g: DateGroup) => (g.project ? <span className="font-medium text-ink-900">{g.project.name}</span> : <span className="text-ink-400">—</span>),
          } as Column<DateGroup>,
        ]),
    {
      key: "materials",
      label: "Materials",
      render: (g) => (
        <span className="text-ink-700">
          {g.rows.length} material{g.rows.length === 1 ? "" : "s"}
        </span>
      ),
    },
    {
      key: "total",
      label: "Total value",
      className: "text-right",
      render: (g) => <span className="tnum font-semibold">{inr(g.total)}</span>,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Inventory · site movements"
        title="Dispatched"
        description="One row per day — tap it to see every material sent out that day."
        actions={
          <Button onClick={() => setDispatching(true)}>
            <Plus className="h-4 w-4" /> Dispatch material
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search material, code or project…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="field !pl-8"
          />
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setGroupByProject(false)}
            className={clsx(
              "inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium border transition-colors",
              !groupByProject ? "bg-ink-900 text-paper-50 border-ink-900" : "border-paper-300 bg-paper-50 text-ink-600 hover:text-ink-900"
            )}
          >
            <List className="h-3.5 w-3.5" /> Flat list
          </button>
          <button
            type="button"
            onClick={() => setGroupByProject(true)}
            className={clsx(
              "inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium border transition-colors",
              groupByProject ? "bg-ink-900 text-paper-50 border-ink-900" : "border-paper-300 bg-paper-50 text-ink-600 hover:text-ink-900"
            )}
          >
            <FolderKanban className="h-3.5 w-3.5" /> By project
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card-pad text-center text-[13px] text-ink-400">Loading…</div>
      ) : !groupByProject ? (
        <DataTable
          columns={dayColumns}
          data={flatDays}
          emptyMessage="Nothing has been dispatched yet."
          onRowClick={(g) => setSelectedKey({ date: g.key, projectKey: g.project?._id ?? "unassigned" })}
        />
      ) : projectGroups.length === 0 ? (
        <div className="card-pad text-center text-[13px] text-ink-400">Nothing has been dispatched yet.</div>
      ) : (
        <div className="space-y-6">
          {projectGroups.map((g) => (
            <section key={g.project?._id ?? "unassigned"}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                  <h2 className="font-serif text-[18px] text-ink-900">{g.project?.name ?? "Unassigned"}</h2>
                  <p className="text-[12px] text-ink-500">
                    {g.rows.length} dispatch{g.rows.length === 1 ? "" : "es"} over {g.days.length} day{g.days.length === 1 ? "" : "s"} · {inr(g.total)}
                  </p>
                </div>
                {g.project && (
                  <Link href={`/procurement/new?destination=project&project=${g.project._id}`}>
                    <Button variant="secondary" size="sm">
                      <ShoppingCart className="h-3.5 w-3.5" /> Raise PO for {g.project.name}
                    </Button>
                  </Link>
                )}
              </div>
              <DataTable
                columns={dayColumns}
                data={g.days}
                emptyMessage=""
                onRowClick={(d) => setSelectedKey({ date: d.key, projectKey: d.project?._id ?? "unassigned" })}
              />
            </section>
          ))}
        </div>
      )}

      <Modal
        open={!!selectedKey}
        onClose={() => setSelectedKey(null)}
        title={selectedDay ? `Dispatched on ${shortDate(selectedDay.date)}` : "Dispatch detail"}
        maxWidth="max-w-2xl"
      >
        {selectedDay && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              {selectedDay.project ? (
                <p className="text-[12.5px] text-ink-500">
                  {selectedDay.project.name} · {selectedDay.rows.length} material{selectedDay.rows.length === 1 ? "" : "s"}
                </p>
              ) : (
                <span />
              )}
              {selectedDay.project && <MaterialArrivedButton projectId={selectedDay.project._id} onArrived={load} />}
            </div>
            <div className="border border-paper-200 overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr>
                    <th className="th">Material</th>
                    <th className="th text-right">Qty</th>
                    <th className="th text-right">Rate</th>
                    <th className="th text-right">Value</th>
                    <th className="th">By</th>
                    <th className="th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDay.rows.map((r) => (
                    <tr key={r._id}>
                      <td className="px-2 py-1.5">
                        <div className="text-[12.5px] font-medium text-ink-900">{r.material?.name ?? r.productId}</div>
                        <div className="text-[11px] text-ink-400">
                          {r.productId}
                          {r.material?.size && ` · ${r.material.size}`}
                          {r.material?.make && ` · ${r.material.make}`}
                          {!groupByProject && r.project && ` · ${r.project.name}`}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-right tnum text-[12.5px]">{qty(r.quantity, r.material?.unit ?? "")}</td>
                      <td className="px-2 py-1.5 text-right tnum text-[12.5px]">{inr(r.rate)}</td>
                      <td className="px-2 py-1.5 text-right tnum text-[12.5px] font-medium">{inr(r.value)}</td>
                      <td className="px-2 py-1.5 text-[11.5px] text-ink-500">{r.createdBy?.name ?? "—"}</td>
                      <td className="px-2 py-1.5">
                        {r.deliveryStatus === "requested" ? (
                          <Chip tone="amber">Requested</Chip>
                        ) : r.deliveryStatus === "in_transit" ? (
                          <Chip tone="blue">In transit</Chip>
                        ) : (
                          <Chip tone="green">Delivered</Chip>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end px-3 py-2 border-t border-paper-200 text-[13px]">
                <span className="font-semibold text-ink-900 tnum">Total {inr(selectedDay.total)}</span>
              </div>
            </div>

            {selectedDay.rows.some((r) => r.deliveryStatus === "requested") && (
              <div className="flex justify-end border-t border-paper-200 pt-3">
                <Button
                  size="sm"
                  onClick={() => sendRequested(selectedDay.rows.filter((r) => r.deliveryStatus === "requested").map((r) => r._id))}
                  disabled={sending}
                >
                  <Send className="h-3.5 w-3.5" />
                  {sending
                    ? "Dispatching…"
                    : `Dispatch ${selectedDay.rows.filter((r) => r.deliveryStatus === "requested").length} requested`}
                </Button>
              </div>
            )}

            {selectedDay.rows.some((r) => r.note) && (
              <div className="border-t border-paper-200 pt-3 space-y-1.5">
                <div className="text-[11px] uppercase tracking-wide text-ink-400">Notes</div>
                {selectedDay.rows
                  .filter((r) => r.note)
                  .map((r) => (
                    <p key={r._id} className="text-[12.5px] text-ink-700">
                      <span className="font-medium text-ink-900">{r.material?.name ?? r.productId}:</span> {r.note}
                    </p>
                  ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <NewDispatchModal
        open={dispatching}
        onClose={() => setDispatching(false)}
        onDispatched={() => {
          setLoading(true);
          load();
        }}
      />
    </div>
  );
}
