"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { clsx } from "clsx";
import { X } from "lucide-react";
import { Chip, Meter, StatusBadge, type Tone } from "@/components/ui/status-badge";
import { apiFetch } from "@/hooks/use-api";
import { inrShort, qty, shortDate } from "@/lib/format";
import type { MapLocation } from "@/server/services/locations";

const ControlMap = dynamic(() => import("@/components/control-room/control-map").then((m) => m.ControlMap), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-paper-200/50 animate-pulse" />,
});

interface Dashboard {
  portfolio: { contractValue: number; earned: number; materialConsumed: number; contribution: number; liveProjects: number };
  stock: {
    total: number;
    lowStock: number;
    movesToday: number;
    lowStockItems: { id: string; name: string; warehouse: string; quantity: number; unit: string }[];
  };
  tasks: {
    open: number;
    overdue: number;
    overdueItems: { _id: string; title: string; dueDate: string; priority: string }[];
    blockedItems: { _id: string; title: string; description?: string }[];
  };
  service: { open: number; urgentItems: { _id: string; serviceId: string; complaint: string; priority: string }[] };
  projects: { id: string; code: string; name: string; status: string; progress: number; earned: number; budget: number; contribution: number }[];
}

interface Move {
  id: string;
  type: string;
  quantity: number;
  createdAt: string;
  sku: string;
  unit: string;
  value: number;
  warehouse: string;
  project: string;
}

type Filter = "ALL" | "WAREHOUSE" | "SITE";

const MOVE_LABEL: Record<string, string> = {
  purchase: "Purchase",
  stock_in: "Stock in",
  stock_out: "Stock out",
  site_issue: "Dispatch",
  site_return: "Return",
  consumed: "Consumed",
  transfer: "Transfer",
  adjustment: "Adjust",
  damaged: "Damaged",
  lost: "Lost",
};

function subscribeMq(cb: () => void) {
  const mq = window.matchMedia("(min-width: 1024px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function useIsDesktop() {
  return useSyncExternalStore(subscribeMq, () => window.matchMedia("(min-width: 1024px)").matches, () => true);
}

function Panel({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overlay-panel overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="text-[12px] font-semibold text-ink-900">{title}</span>
        <span className="text-ink-400 text-[14px] leading-none">{open ? "–" : "+"}</span>
      </button>
      {open && <div className="px-3 pb-3 pt-2.5 border-t border-paper-200 space-y-2.5">{children}</div>}
    </div>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "pos" | "neg" | "warn" }) {
  return (
    <div className="border border-paper-200 px-2.5 py-1.5 min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400 truncate">{label}</div>
      <div
        className={clsx(
          "mt-0.5 text-[13.5px] font-semibold tnum",
          tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : tone === "warn" ? "text-warn" : "text-ink-900"
        )}
      >
        {value}
      </div>
      {sub && <div className="text-[10.5px] text-ink-500 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2 text-ink-700">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function actionsFrom(d: Dashboard) {
  const out: { tone: Tone; kicker: string; title: string; detail: string; value: string; href: string }[] = [];
  for (const s of d.service.urgentItems)
    out.push({ tone: "red", kicker: "Needs action", title: `${s.serviceId} · ${s.priority}`, detail: s.complaint, value: "", href: "/service" });
  for (const p of d.projects.filter((p) => p.earned > 0 && p.contribution < 0))
    out.push({ tone: "red", kicker: "Loss", title: `${p.name}`, detail: "Running below cost at today's completion.", value: inrShort(p.contribution), href: `/projects/${p.id}` });
  if (d.stock.lowStock)
    out.push({
      tone: "red",
      kicker: "Reorder",
      title: `${d.stock.lowStock} stock line${d.stock.lowStock === 1 ? "" : "s"} at reorder level`,
      detail: d.stock.lowStockItems.slice(0, 2).map((i) => `${i.name} (${i.warehouse})`).join(", "),
      value: "",
      href: "/inventory",
    });
  for (const t of d.tasks.overdueItems.slice(0, 2))
    out.push({ tone: "amber", kicker: "Overdue", title: t.title, detail: `Was due ${shortDate(t.dueDate)}.`, value: "", href: "/tasks" });
  for (const t of d.tasks.blockedItems.slice(0, 1))
    out.push({ tone: "amber", kicker: "Waiting", title: t.title, detail: t.description || "Blocked.", value: "", href: "/tasks" });
  return out;
}

export default function ControlRoomPage() {
  const isDesktop = useIsDesktop();
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [moves, setMoves] = useState<Move[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [headerOpen, setHeaderOpen] = useState(true);
  const [panelsOpen, setPanelsOpen] = useState(true);
  const [tablesOpen, setTablesOpen] = useState(false);
  const [tab, setTab] = useState<"locations" | "jobs" | "moves">("locations");

  useEffect(() => {
    Promise.all([apiFetch("/api/dashboard"), apiFetch("/api/control-room")]).then(([d, c]) => {
      if (!d.success || !c.success) return setError(d.error?.message ?? c.error?.message ?? "Could not load");
      setDash(d.data);
      setLocations(c.data.locations);
      setMoves(c.data.moves);
    });
  }, []);

  const visible = useMemo(() => locations.filter((l) => filter === "ALL" || l.type === filter), [locations, filter]);
  const selected = locations.find((l) => l.id === selectedId) ?? null;
  const unpinned = locations.filter((l) => l.lat == null || l.lng == null);
  const whValue = locations.filter((l) => l.type === "WAREHOUSE").reduce((s, l) => s + l.stockValue, 0);
  const siteValue = locations.filter((l) => l.type === "SITE").reduce((s, l) => s + l.stockValue, 0);
  const stockTotal = whValue + siteValue;
  const actions = dash ? actionsFrom(dash) : [];
  const lead = dash ? [...dash.projects].filter((p) => p.earned > 0).sort((a, b) => b.contribution - a.contribution)[0] : undefined;
  const thin = dash
    ? [...dash.projects].filter((p) => p.earned > 0).sort((a, b) => a.contribution / a.earned - b.contribution / b.earned)[0]
    : undefined;

  const padding = isDesktop
    ? { top: headerOpen ? 190 : 80, left: panelsOpen ? 340 : 40, right: selected ? 380 : 60, bottom: 70 }
    : { top: 160, left: 30, right: 30, bottom: 120 };

  if (error) return <div className="m-6 card-pad text-[13px] text-neg">{error}</div>;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <ControlMap locations={visible} selectedId={selectedId} onSelect={setSelectedId} padding={padding} />

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
        <div className="pointer-events-auto px-2 sm:px-3 pt-2 sm:pt-3 pr-12 sm:pr-14 shrink-0">
          <div className="overlay-panel px-3 py-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHeaderOpen((o) => !o)}
                aria-label={headerOpen ? "Collapse summary" : "Expand summary"}
                className="text-ink-400 hover:text-ink-800 text-[16px] leading-none px-1 min-h-8"
              >
                {headerOpen ? "–" : "+"}
              </button>
              <h1 className="text-[13px] font-semibold text-ink-900 truncate">Control room</h1>
              <span className="hidden md:inline text-[11.5px] text-ink-400 truncate">
                Live ledger · {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-1">
                {(["ALL", "WAREHOUSE", "SITE"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    aria-pressed={filter === f}
                    className={clsx(
                      "chip",
                      filter === f ? "bg-ink-900 text-paper-50 ring-1 ring-ink-900" : "bg-paper-100 text-ink-600 ring-1 ring-paper-300"
                    )}
                  >
                    {f === "ALL" ? "All" : f === "WAREHOUSE" ? "Warehouses" : "Sites"}
                  </button>
                ))}
              </div>
            </div>
            {headerOpen && dash && (
              <div className="mt-2 pt-2 border-t border-paper-200 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <Tile label="Inventory" value={inrShort(stockTotal)} sub={`${locations.length} locations`} />
                  <Tile label="Earned" value={inrShort(dash.portfolio.earned)} sub={`of ${inrShort(dash.portfolio.contractValue)}`} />
                  <Tile label="Material" value={inrShort(dash.portfolio.materialConsumed)} sub="consumed" />
                  <Tile
                    label="Contribution"
                    value={inrShort(dash.portfolio.contribution)}
                    tone={dash.portfolio.contribution >= 0 ? "pos" : "neg"}
                    sub={dash.portfolio.earned ? `${((dash.portfolio.contribution / dash.portfolio.earned) * 100).toFixed(1)}% margin` : undefined}
                  />
                </div>
                <div className="hidden sm:grid grid-cols-3 gap-3 text-ink-800">
                  <div className="min-w-0">
                    <div className="font-serif text-[16px] leading-snug truncate">
                      {lead ? `${lead.name.split(" ").slice(0, 3).join(" ")} is carrying the book` : "No earned work yet"}
                    </div>
                    <p className="text-[11px] text-ink-500 mt-0.5 leading-snug">
                      {lead
                        ? `${((lead.contribution / lead.earned) * 100).toFixed(1)}% contribution.${thin && thin.id !== lead.id ? ` ${thin.name.split(" ").slice(0, 2).join(" ")} thinnest at ${((thin.contribution / thin.earned) * 100).toFixed(1)}%.` : ""}`
                        : "—"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <div className="font-serif text-[16px] leading-snug truncate">
                      {stockTotal ? `${Math.round((whValue / stockTotal) * 100)}% of stock is in warehouses` : "No stock held"}
                    </div>
                    <p className="text-[11px] text-ink-500 mt-0.5 leading-snug">
                      Warehouses {inrShort(whValue)} · sites {inrShort(siteValue)}.
                    </p>
                  </div>
                  <div className="min-w-0">
                    <div className="font-serif text-[16px] leading-snug truncate">
                      {actions.filter((a) => a.tone === "red").length} need action
                    </div>
                    <p className="text-[11px] text-ink-500 mt-0.5 leading-snug">
                      {dash.tasks.overdue} overdue tasks · {dash.service.open} open service.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 relative px-2 sm:px-3 py-2">
          {panelsOpen ? (
            <div className="pointer-events-auto absolute left-2 sm:left-3 top-2 bottom-2 w-[min(100%-16px,300px)] overflow-y-auto space-y-2 pr-1 max-lg:bottom-auto max-lg:max-h-[50%]">
              <Panel title="Layers" defaultOpen={isDesktop}>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                  <Legend color="#2563eb" label="Warehouse" />
                  <Legend color="#7c3aed" label="Site store" />
                </div>
                {unpinned.length > 0 && (
                  <p className="text-[11px] text-ink-500 leading-relaxed">
                    {unpinned.length} location{unpinned.length === 1 ? " has" : "s have"} no coordinates:{" "}
                    {unpinned.map((l) => l.name).join(", ")}. Add latitude/longitude to pin them.
                  </p>
                )}
                <button type="button" onClick={() => setPanelsOpen(false)} className="text-[11px] text-ink-500 hover:text-ink-900">
                  Hide panels
                </button>
              </Panel>
              <Panel title={`Needs attention · ${actions.length}`} defaultOpen={isDesktop}>
                {actions.length === 0 && <p className="text-[12px] text-ink-400">Nothing urgent.</p>}
                {actions.map((a, i) => (
                  <Link key={i} href={a.href} className="flex items-start gap-2 -mx-1 px-1 py-1 hover:bg-paper-100/80">
                    <Chip tone={a.tone} className="mt-0.5 shrink-0 !px-1.5 !text-[10px]">
                      {a.kicker}
                    </Chip>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-medium text-ink-900 leading-snug truncate">{a.title}</div>
                      <div className="text-[11px] text-ink-500 leading-snug line-clamp-2">{a.detail}</div>
                    </div>
                    {a.value && <span className="tnum text-[11px] font-medium text-neg shrink-0">{a.value}</span>}
                  </Link>
                ))}
              </Panel>
              <Panel title="Stock by location">
                {locations
                  .filter((l) => l.stockValue > 0)
                  .sort((a, b) => b.stockValue - a.stockValue)
                  .map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setSelectedId(l.id)}
                      className="block w-full text-left space-y-1"
                    >
                      <div className="flex items-baseline justify-between gap-2 text-[11.5px]">
                        <span className="truncate text-ink-800">{l.name}</span>
                        <span className="tnum font-semibold text-ink-900">{inrShort(l.stockValue)}</span>
                      </div>
                      <Meter pct={stockTotal ? (l.stockValue / stockTotal) * 100 : 0} tone={l.type === "WAREHOUSE" ? "brand" : "warn"} />
                    </button>
                  ))}
              </Panel>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPanelsOpen(true)}
              className="pointer-events-auto absolute left-2 sm:left-3 top-2 overlay-panel px-3 py-1.5 text-[12px] font-medium text-ink-800"
            >
              Show panels
            </button>
          )}

          {selected && (
            <aside className="pointer-events-auto overlay-panel p-3 overflow-y-auto max-lg:absolute max-lg:left-2 max-lg:right-2 max-lg:bottom-2 max-lg:max-h-[60%] lg:absolute lg:right-3 lg:top-2 lg:bottom-2 lg:w-[340px] z-20">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="kicker">
                    {selected.type === "WAREHOUSE" ? "Warehouse" : `Site · ${selected.code}`}
                  </div>
                  <h2 className="font-serif text-[22px] leading-tight text-ink-900 mt-0.5">{selected.name}</h2>
                  <div className="tnum text-[12px] text-ink-600 mt-0.5">
                    {inrShort(selected.stockValue)} · {selected.skuCount} SKUs
                    {selected.type === "SITE" && ` · ${selected.completionPct}% done`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Close details"
                  className="p-1 text-ink-400 hover:text-ink-900 hover:bg-paper-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {selected.address && <p className="text-[11.5px] text-ink-500 mt-2 leading-relaxed">{selected.address}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selected.status && <StatusBadge status={selected.status} />}
                {selected.projectCode && <Chip tone="slate">{selected.projectCode}</Chip>}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                <Tile label="Stock here" value={inrShort(selected.stockValue)} sub={`${selected.skuCount} SKUs`} />
                {selected.type === "SITE" ? (
                  <>
                    <Tile label="Done" value={`${selected.completionPct}%`} sub={`${inrShort(selected.earned ?? 0)} earned`} />
                    <Tile
                      label="Contribution"
                      value={inrShort(selected.contribution ?? 0)}
                      tone={(selected.contribution ?? 0) >= 0 ? "pos" : "neg"}
                      sub="whole project"
                    />
                    <Tile
                      label="BOQ variance"
                      value={selected.materialVariance == null ? "—" : `${selected.materialVariance > 0 ? "+" : ""}${inrShort(selected.materialVariance)}`}
                      tone={selected.materialVariance != null && selected.materialVariance > 0 ? "neg" : "pos"}
                      sub={selected.materialVariance != null && selected.materialVariance > 0 ? "over BOQ" : "within BOQ"}
                    />
                  </>
                ) : (
                  <Tile
                    label="Share of stock"
                    value={`${stockTotal ? Math.round((selected.stockValue / stockTotal) * 100) : 0}%`}
                    sub="of all locations"
                  />
                )}
              </div>
              {selected.type === "SITE" && (
                <div className="mt-2">
                  <Meter
                    pct={selected.completionPct ?? 0}
                    tone={selected.materialVariance != null && selected.materialVariance > 0 ? "warn" : "brand"}
                  />
                </div>
              )}
              <div className="mt-3 map-table">
                <div className="label mb-1">On this pin</div>
                {selected.topSkus.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th className="th">SKU</th>
                        <th className="th text-right">Qty</th>
                        <th className="th text-right">₹</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.topSkus.map((s) => (
                        <tr key={s.code}>
                          <td className="td">
                            <div className="font-mono text-[10px] text-ink-400">{s.code}</div>
                            <div className="text-ink-800 truncate max-w-[150px]">{s.description}</div>
                          </td>
                          <td className="tdn">{qty(s.qty, s.unit)}</td>
                          <td className="tdn font-medium">{inrShort(s.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-[12px] text-ink-400">No stock held here.</p>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.projectId && (
                  <Link href={`/projects/${selected.projectId}`} className="btn-primary !text-[12px] !py-1">
                    Open job
                  </Link>
                )}
                <Link
                  href={selected.type === "WAREHOUSE" ? "/inventory" : "/sites"}
                  className="btn-ghost !text-[12px] !py-1"
                >
                  {selected.type === "WAREHOUSE" ? "Inventory" : "Sites"}
                </Link>
              </div>
            </aside>
          )}
        </div>

        <div className="pointer-events-auto px-2 sm:px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] w-full lg:w-[min(100%,520px)]">
          {tablesOpen ? (
            <div className="overlay-panel flex flex-col overflow-hidden h-[min(38vh,280px)] lg:h-[220px]">
              <div className="px-1.5 py-1 border-b border-paper-200 flex items-center gap-1 shrink-0">
                {(
                  [
                    ["locations", "Locations"],
                    ["jobs", "Jobs"],
                    ["moves", "Moves"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTab(k)}
                    className={clsx(
                      "chip",
                      tab === k ? "bg-ink-900 text-paper-50 ring-1 ring-ink-900" : "bg-paper-100 text-ink-600 ring-1 ring-paper-300"
                    )}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setTablesOpen(false)}
                  className="ml-auto text-[11px] text-ink-500 hover:text-ink-900 px-2"
                >
                  Hide
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-auto map-table">
                {tab === "locations" && (
                  <table>
                    <thead>
                      <tr>
                        <th className="th">Location</th>
                        <th className="th text-right">₹</th>
                        <th className="th text-right">SKU</th>
                        <th className="th text-right">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((l) => (
                        <tr
                          key={l.id}
                          onClick={() => setSelectedId(l.id)}
                          className={clsx("cursor-pointer", l.id === selectedId ? "bg-brand-50" : "hover:bg-paper-100")}
                        >
                          <td className="td font-medium text-ink-900">
                            <span className="text-ink-400 mr-1">{l.type === "WAREHOUSE" ? "WH" : "S"}</span>
                            {l.name}
                          </td>
                          <td className="tdn font-medium">{inrShort(l.stockValue)}</td>
                          <td className="tdn">{l.skuCount}</td>
                          <td className="tdn">{l.type === "SITE" ? l.completionPct : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {tab === "jobs" && dash && (
                  <table>
                    <thead>
                      <tr>
                        <th className="th">Job</th>
                        <th className="th text-right">Done</th>
                        <th className="th text-right">Earned</th>
                        <th className="th text-right">Contrib.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dash.projects.map((p) => (
                        <tr key={p.id} className="hover:bg-paper-100">
                          <td className="td">
                            <Link href={`/projects/${p.id}`} className="font-medium text-ink-900 hover:underline">
                              {p.name}
                            </Link>
                          </td>
                          <td className="tdn">{p.progress}%</td>
                          <td className="tdn">{inrShort(p.earned)}</td>
                          <td className={clsx("tdn font-medium", p.contribution < 0 ? "text-neg" : "text-pos")}>
                            {inrShort(p.contribution)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {tab === "moves" && (
                  <table>
                    <thead>
                      <tr>
                        <th className="th">When</th>
                        <th className="th">Type</th>
                        <th className="th">SKU</th>
                        <th className="th text-right">Qty</th>
                        <th className="th text-right">₹</th>
                      </tr>
                    </thead>
                    <tbody>
                      {moves.map((m) => (
                        <tr key={m.id} className="hover:bg-paper-100">
                          <td className="td text-ink-500">{shortDate(m.createdAt)}</td>
                          <td className="td">{MOVE_LABEL[m.type] ?? m.type}</td>
                          <td className="td font-mono text-[10.5px]">
                            {m.sku}
                            {m.project && <span className="text-ink-400"> · {m.project}</span>}
                          </td>
                          <td className="tdn">{qty(m.quantity, m.unit)}</td>
                          <td className="tdn">{inrShort(m.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setTablesOpen(true)}
              className="overlay-panel px-3 py-1.5 text-[12px] font-medium text-ink-800"
            >
              Show tables
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
