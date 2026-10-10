"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import {
  ArrowLeft,
  Plus,
  Search,
  Trash2,
  List,
  Building2,
  Phone,
  Mail,
  MapPin,
  X,
  CheckCircle2,
  PackageSearch,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-field";
import { apiFetch, apiPost } from "@/hooks/use-api";
import { inr, qty } from "@/lib/format";

/* ── types ── */
interface Vendor {
  _id: string;
  vendorName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
}

interface MaterialOption {
  _id: string;
  productId: string;
  name: string;
  category: string;
  make?: string;
  size?: string;
  unit: string;
  quantity: number;
  purchasePrice: number;
}

interface ProjectOption {
  _id: string;
  projectId: string;
  name: string;
}

interface OrderLine {
  material: string;
  productId: string;
  name: string;
  unit: string;
  quantity: string;
  rate: string;
}

/* ── small helper: numbered step label for each section ── */
function StepHeader({
  step,
  title,
  description,
  done,
  actions,
}: {
  step: number;
  title: string;
  description?: string;
  done?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
      <div className="flex items-start gap-3">
        <div
          className={clsx(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold mt-0.5 transition-colors",
            done ? "bg-pos text-paper-50" : "bg-ink-900 text-paper-50"
          )}
        >
          {done ? <CheckCircle2 className="h-4 w-4" /> : step}
        </div>
        <div>
          <h2 className="font-serif text-[20px] leading-tight text-ink-900">{title}</h2>
          {description && <p className="mt-0.5 text-[12.5px] text-ink-500">{description}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}

export default function NewPrimaryOrderPage() {
  return (
    <Suspense fallback={null}>
      <NewPrimaryOrderForm />
    </Suspense>
  );
}

interface RestockLine {
  material: string;
  productId: string;
  name: string;
  unit: string;
  quantity: number;
  rate: number;
}

function parseRestockParam(raw: string | null): OrderLine[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as RestockLine[];
    return parsed.map((p) => ({
      material: p.material,
      productId: p.productId,
      name: p.name,
      unit: p.unit,
      quantity: String(p.quantity),
      rate: p.rate ? String(p.rate) : "",
    }));
  } catch {
    return [];
  }
}

function NewPrimaryOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /* vendor */
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorId, setVendorId] = useState("");
  const vendor = vendors.find((v) => v._id === vendorId);
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorHighlighted, setVendorHighlighted] = useState(0);
  const vendorBoxRef = useRef<HTMLDivElement>(null);

  /* material picking */
  const [mode, setMode] = useState<"browse" | "search">("search");
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<MaterialOption[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const [browseList, setBrowseList] = useState<MaterialOption[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseFilter, setBrowseFilter] = useState("");
  const searchBoxRef = useRef<HTMLDivElement>(null);

  /* order lines — pre-filled when arriving from the low-stock alert via ?restock= */
  const [restockCount] = useState(() => parseRestockParam(searchParams.get("restock")).length);
  const [lines, setLines] = useState<OrderLine[]>(() => parseRestockParam(searchParams.get("restock")));
  const [justAdded, setJustAdded] = useState<string | null>(null);

  /* destination — defaults can arrive pre-set from the low-stock alert via ?destination=&project= */
  const [expectedDate, setExpectedDate] = useState("");
  const [destination, setDestination] = useState<"inventory" | "project">(
    () => (searchParams.get("destination") === "project" ? "project" : "inventory")
  );
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState(() => searchParams.get("project") ?? "");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  /* ── load vendors + projects once ── */
  useEffect(() => {
    apiFetch("/api/vendors?limit=200&sort=vendorName").then((j) => j.success && setVendors(j.data));
    apiFetch("/api/projects?limit=200&sort=name").then((j) => j.success && setProjects(j.data));
  }, []);

  /* ── browse: load full material list when toggled on ── */
  useEffect(() => {
    if (mode !== "browse") return;
    let cancelled = false;
    queueMicrotask(() => !cancelled && setBrowseLoading(true));
    apiFetch("/api/materials?limit=200&sort=name").then((j) => {
      if (cancelled) return;
      if (j.success) setBrowseList(j.data);
      setBrowseLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  /* ── search: debounced suggestions ── */
  useEffect(() => {
    if (mode !== "search" || !searchInput.trim()) {
      queueMicrotask(() => setSearchResults([]));
      return;
    }
    const t = setTimeout(() => {
      apiFetch(`/api/materials?search=${encodeURIComponent(searchInput.trim())}&limit=15`).then((j) => {
        if (j.success) {
          setSearchResults(j.data);
          setHighlighted(0);
        }
      });
    }, 220);
    return () => clearTimeout(t);
  }, [searchInput, mode]);

  /* ── close search dropdown on outside click ── */
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
      if (vendorBoxRef.current && !vendorBoxRef.current.contains(e.target as Node)) {
        setVendorSearch("");
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  /* ── vendor suggestions, filtered client-side (vendor list is small) ── */
  const vendorResults = useMemo(() => {
    const q = vendorSearch.trim().toLowerCase();
    if (!q) return [];
    return vendors
      .filter(
        (v) =>
          v.vendorName.toLowerCase().includes(q) ||
          v.contactPerson?.toLowerCase().includes(q) ||
          v.city?.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [vendors, vendorSearch]);

  function selectVendor(v: Vendor) {
    setVendorId(v._id);
    setVendorSearch("");
  }

  function handleVendorSearchChange(value: string) {
    setVendorSearch(value);
    setVendorHighlighted(0);
  }

  function handleVendorKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (vendorResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setVendorHighlighted((h) => Math.min(h + 1, vendorResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setVendorHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectVendor(vendorResults[vendorHighlighted]);
    } else if (e.key === "Escape") {
      setVendorSearch("");
    }
  }

  /* ── add a material to the order lines ── */
  function addLine(m: MaterialOption) {
    setLines((prev) => {
      if (prev.some((l) => l.material === m._id)) return prev; // already added
      return [
        ...prev,
        {
          material: m._id,
          productId: m.productId,
          name: m.name + (m.size ? ` · ${m.size}` : ""),
          unit: m.unit,
          quantity: "1",
          rate: m.purchasePrice ? String(m.purchasePrice) : "",
        },
      ];
    });
    setSearchInput("");
    setSearchResults([]);
    setJustAdded(m._id);
    setTimeout(() => setJustAdded(null), 1200);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (searchResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      addLine(searchResults[highlighted]);
    } else if (e.key === "Escape") {
      setSearchResults([]);
    }
  }

  function updateLine(i: number, patch: Partial<OrderLine>) {
    setLines((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, j) => j !== i));
  }

  const total = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.rate) || 0), 0),
    [lines]
  );

  const filteredBrowseList = useMemo(() => {
    if (!browseFilter.trim()) return browseList;
    const q = browseFilter.trim().toLowerCase();
    return browseList.filter(
      (m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || m.productId.toLowerCase().includes(q)
    );
  }, [browseList, browseFilter]);

  const vendorDone = !!vendorId;
  const materialsDone = lines.length > 0;
  const badQtyRate = lines.some((l) => !(Number(l.quantity) > 0) || !(Number(l.rate) >= 0));

  async function handleSubmit() {
    setTouched(true);
    setError("");
    if (!vendorId) return setError("Please select a vendor.");
    if (lines.length === 0) return setError("Add at least one material.");
    if (badQtyRate) return setError("Every line needs a quantity above zero and a rate.");
    if (!expectedDate) return setError("Please pick an expected delivery date.");
    if (destination === "project" && !projectId) return setError("Please select a project for direct delivery.");

    setSaving(true);
    const res = await apiPost("/api/primary-orders", {
      vendor: vendorId,
      lines: lines.map((l) => ({ material: l.material, quantity: l.quantity, rate: l.rate })),
      expectedDate,
      destination,
      project: destination === "project" ? projectId : undefined,
      notes,
    });
    setSaving(false);

    if (res.success === false) {
      setError(res.error?.message ?? "Could not place the order.");
      return;
    }
    router.push("/procurement");
  }

  return (
    <div className="space-y-8 max-w-4xl pb-28">
      <PageHeader
        kicker="Procurement · new order"
        title="Place a purchase order"
        description="Pick a vendor, add materials from the catalogue, then choose where the order should land."
        actions={
          <Link href="/procurement">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
        }
      />

      {restockCount > 0 && (
        <div className="flex items-start gap-2.5 border border-warn/30 bg-warn/10 px-4 py-3 text-[13px] text-ink-700">
          <AlertTriangle className="h-4 w-4 text-warn shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-ink-900">{restockCount} material{restockCount === 1 ? "" : "s"} pre-filled</span> from the
            low-stock alert, each at the quantity needed to clear the shortfall. Pick a vendor, check the rates, and place the order.
          </div>
        </div>
      )}

      {/* ── 1. Vendor ── */}
      <section className="card-pad space-y-4">
        <StepHeader step={1} title="Vendor" description="Select who this order is placed with." done={vendorDone} />
        <div className="relative" ref={vendorBoxRef}>
          <div className="label mb-1.5">
            Vendor <span className="text-neg">*</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder={vendor ? vendor.vendorName : "Search vendor name, contact or city…"}
              value={vendorSearch}
              onChange={(e) => handleVendorSearchChange(e.target.value)}
              onKeyDown={handleVendorKeyDown}
              className={clsx("field !pl-8 !pr-8", touched && !vendorId && "!border-neg")}
            />
            {vendorSearch ? (
              <button
                type="button"
                onClick={() => setVendorSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              vendorId && (
                <CheckCircle2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pos" />
              )
            )}
          </div>
          {touched && !vendorId && <p className="mt-1 text-[12px] text-neg">Choose a vendor to continue</p>}

          {vendorSearch && vendorResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full max-h-72 overflow-y-auto card divide-y divide-paper-200 shadow-lg">
              {vendorResults.map((v, i) => (
                <button
                  key={v._id}
                  type="button"
                  onClick={() => selectVendor(v)}
                  onMouseEnter={() => setVendorHighlighted(i)}
                  className={clsx(
                    "w-full text-left px-3 py-2 transition-colors",
                    i === vendorHighlighted ? "bg-paper-200/80" : "hover:bg-paper-100"
                  )}
                >
                  <div className="text-[13px] font-medium text-ink-900">{v.vendorName}</div>
                  <div className="text-[11.5px] text-ink-400">
                    {v.contactPerson} · {v.phone}
                    {v.city ? ` · ${v.city}` : ""}
                  </div>
                </button>
              ))}
            </div>
          )}
          {vendorSearch && vendorResults.length === 0 && (
            <div className="absolute z-10 mt-1 w-full card px-3 py-3 text-center text-[12.5px] text-ink-400 shadow-lg">
              No vendors match “{vendorSearch.trim()}”.
            </div>
          )}
        </div>

        {vendor ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 rounded border border-paper-200 bg-paper-100/60 px-4 py-3 text-[13px] animate-[fadeIn_0.15s_ease]">
            <div className="flex items-center gap-2 text-ink-700">
              <Building2 className="h-3.5 w-3.5 text-ink-400 shrink-0" /> {vendor.contactPerson}
            </div>
            <div className="flex items-center gap-2 text-ink-700">
              <Phone className="h-3.5 w-3.5 text-ink-400 shrink-0" /> {vendor.phone}
            </div>
            {vendor.email && (
              <div className="flex items-center gap-2 text-ink-700">
                <Mail className="h-3.5 w-3.5 text-ink-400 shrink-0" /> {vendor.email}
              </div>
            )}
            {(vendor.address || vendor.city) && (
              <div className="flex items-center gap-2 text-ink-700">
                <MapPin className="h-3.5 w-3.5 text-ink-400 shrink-0" />
                {[vendor.address, vendor.city, vendor.state].filter(Boolean).join(", ")}
              </div>
            )}
          </div>
        ) : (
          <p className="text-[12.5px] text-ink-400">Vendor details — contact, phone, address — will appear here once selected.</p>
        )}
      </section>

      {/* ── 2. Materials ── */}
      <section className="card-pad space-y-4">
        <StepHeader
          step={2}
          title="Materials"
          description="Browse the full catalogue, or search and pick from suggestions."
          done={materialsDone}
          actions={
            <div className="flex items-center gap-2">
              {lines.length > 0 && (
                <span className="text-[12px] font-medium text-ink-500">
                  {lines.length} item{lines.length === 1 ? "" : "s"} added
                </span>
              )}
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setMode("search")}
                  className={clsx(
                    "inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium border transition-colors",
                    mode === "search"
                      ? "bg-ink-900 text-paper-50 border-ink-900"
                      : "border-paper-300 bg-paper-50 text-ink-600 hover:text-ink-900"
                  )}
                >
                  <Search className="h-3.5 w-3.5" /> Search
                </button>
                <button
                  type="button"
                  onClick={() => setMode("browse")}
                  className={clsx(
                    "inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium border transition-colors",
                    mode === "browse"
                      ? "bg-ink-900 text-paper-50 border-ink-900"
                      : "border-paper-300 bg-paper-50 text-ink-600 hover:text-ink-900"
                  )}
                >
                  <List className="h-3.5 w-3.5" /> Browse all
                </button>
              </div>
            </div>
          }
        />

        {mode === "search" && (
          <div className="relative" ref={searchBoxRef}>
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder="Search material name, make or size… (↓↑ to navigate, ↵ to add)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="field !pl-8 !pr-8"
              autoFocus
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {searchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full max-h-72 overflow-y-auto card divide-y divide-paper-200 shadow-lg">
                {searchResults.map((m, i) => (
                  <button
                    key={m._id}
                    type="button"
                    onClick={() => addLine(m)}
                    onMouseEnter={() => setHighlighted(i)}
                    className={clsx(
                      "w-full text-left px-3 py-2 transition-colors flex items-center justify-between gap-3",
                      i === highlighted ? "bg-paper-200/80" : "hover:bg-paper-100"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-ink-900 truncate">{m.name}</div>
                      <div className="text-[11.5px] text-ink-400">
                        {m.productId} · {m.size || m.make || m.category}
                      </div>
                    </div>
                    <div className="text-right shrink-0 text-[12px]">
                      <div className="tnum text-ink-700">{qty(m.quantity, m.unit)} in stock</div>
                      <div className="tnum text-ink-500">{m.purchasePrice ? inr(m.purchasePrice) : "no rate"}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searchInput.trim() && searchResults.length === 0 && (
              <div className="absolute z-10 mt-1 w-full card px-3 py-3 text-center text-[12.5px] text-ink-400 shadow-lg">
                No materials match “{searchInput.trim()}”.
              </div>
            )}
          </div>
        )}

        {mode === "browse" && (
          <div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Filter this list…"
                value={browseFilter}
                onChange={(e) => setBrowseFilter(e.target.value)}
                className="field !pl-8"
              />
            </div>
            <div className="max-h-96 overflow-y-auto border border-paper-200 divide-y divide-paper-200">
              {browseLoading ? (
                <div className="p-6 text-center text-[13px] text-ink-400">Loading catalogue…</div>
              ) : filteredBrowseList.length === 0 ? (
                <div className="p-6 text-center text-[13px] text-ink-400">No materials match that filter.</div>
              ) : (
                filteredBrowseList.map((m) => {
                  const added = lines.some((l) => l.material === m._id);
                  return (
                    <button
                      key={m._id}
                      type="button"
                      disabled={added}
                      onClick={() => addLine(m)}
                      className={clsx(
                        "w-full text-left px-3 py-2 flex items-center justify-between gap-3 transition-colors",
                        added ? "bg-pos/5 cursor-default" : "hover:bg-paper-100"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-ink-900 truncate">{m.name}</div>
                        <div className="text-[11.5px] text-ink-400">
                          {m.productId} · {m.size || m.make || m.category} · {m.unit}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {added ? (
                          <span className="inline-flex items-center gap-1 text-[11.5px] text-pos font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Added
                          </span>
                        ) : (
                          <Plus className="h-4 w-4 text-ink-400" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── Order lines ── */}
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 border border-dashed border-paper-300 py-10 text-center">
            <PackageSearch className="h-7 w-7 text-ink-300" strokeWidth={1.5} />
            <p className="text-[13px] text-ink-400">No materials added yet.</p>
            <p className="text-[12px] text-ink-400">Search above or browse the catalogue to add items.</p>
          </div>
        ) : (
          <div className="border border-paper-200 overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr>
                  <th className="th">Material</th>
                  <th className="th w-28 text-right">Qty</th>
                  <th className="th w-28 text-right">Rate ₹</th>
                  <th className="th w-28 text-right">Amount</th>
                  <th className="th w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => {
                  const lineBad = !(Number(l.quantity) > 0) || !(Number(l.rate) >= 0);
                  return (
                    <tr key={l.material} className={clsx(justAdded === l.material && "bg-pos/5")}>
                      <td className="px-2 py-1.5 text-[13px] text-ink-900">{l.name}</td>
                      <td className="px-2 py-1.5">
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            className={clsx("field !py-1.5 !text-[13px] !pr-9 text-right", touched && lineBad && "!border-neg")}
                            value={l.quantity}
                            onChange={(e) => updateLine(i, { quantity: e.target.value })}
                          />
                          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10.5px] text-ink-400">
                            {l.unit}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className={clsx("field !py-1.5 !text-[13px] text-right", touched && lineBad && "!border-neg")}
                          value={l.rate}
                          onChange={(e) => updateLine(i, { rate: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right tnum text-[13px] font-medium">
                        {inr((Number(l.quantity) || 0) * (Number(l.rate) || 0))}
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(i)}
                          className="p-1.5 text-ink-400 hover:text-neg"
                          aria-label={`Remove ${l.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-3 py-2 border-t border-paper-200 text-[13px]">
              <button type="button" onClick={() => setLines([])} className="text-[12px] text-ink-400 hover:text-neg">
                Clear all
              </button>
              <span className="font-semibold text-ink-900 tnum">Total {inr(total)}</span>
            </div>
          </div>
        )}
      </section>

      {/* ── 3. Delivery ── */}
      <section className="card-pad space-y-4">
        <StepHeader step={3} title="Delivery" description="When it's expected, and where it should land." done={!!expectedDate} />
        <FormInput
          label="Expected delivery date"
          required
          type="date"
          value={expectedDate}
          onChange={(e) => setExpectedDate(e.target.value)}
          error={touched && !expectedDate ? "Pick an expected date" : undefined}
          className="max-w-xs"
        />

        <div>
          <div className="label mb-1.5">Destination</div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setDestination("inventory")}
              className={clsx(
                "px-3 py-1.5 text-[13px] font-medium border transition-colors",
                destination === "inventory"
                  ? "bg-ink-900 text-paper-50 border-ink-900"
                  : "border-paper-300 bg-paper-50 text-ink-600 hover:text-ink-900"
              )}
            >
              To inventory
            </button>
            <button
              type="button"
              onClick={() => setDestination("project")}
              className={clsx(
                "px-3 py-1.5 text-[13px] font-medium border transition-colors",
                destination === "project"
                  ? "bg-ink-900 text-paper-50 border-ink-900"
                  : "border-paper-300 bg-paper-50 text-ink-600 hover:text-ink-900"
              )}
            >
              Direct to project
            </button>
          </div>
          <p className="mt-1.5 text-[12px] text-ink-400">
            {destination === "inventory"
              ? "Stock arrives into the warehouse and can be allocated to any project later."
              : "Stock is booked straight against one project's site."}
          </p>
        </div>

        {destination === "project" && (
          <FormSelect
            label="Project"
            required
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            error={touched && !projectId ? "Choose a project" : undefined}
            className="max-w-md"
          >
            <option value="">Select project</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </FormSelect>
        )}

        <FormTextarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </section>

      {/* ── Sticky summary bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-paper-300 bg-paper-50/95 backdrop-blur supports-[backdrop-filter]:bg-paper-50/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-0 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[13px] text-ink-600">
            {lines.length > 0 ? (
              <>
                <span className="font-semibold text-ink-900 tnum">{inr(total)}</span>
                <span className="text-ink-400"> · {lines.length} item{lines.length === 1 ? "" : "s"}</span>
                {vendor && <span className="text-ink-400"> · {vendor.vendorName}</span>}
              </>
            ) : (
              <span className="text-ink-400">Add materials to see the order total.</span>
            )}
            {error && <div className="text-neg mt-0.5">{error}</div>}
          </div>
          <div className="flex gap-2">
            <Link href="/procurement">
              <Button variant="secondary">Cancel</Button>
            </Link>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Placing order…" : "Place order"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
