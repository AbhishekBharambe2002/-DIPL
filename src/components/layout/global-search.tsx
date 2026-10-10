"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { clsx } from "clsx";
import { Search } from "lucide-react";
import { navigation } from "@/config/navigation";
import type { Permission } from "@/config/permissions";

interface SearchResult {
  type: "project" | "site" | "customer" | "product" | "employee";
  _id: string;
  name?: string;
  companyName?: string;
  projectId?: string;
  siteId?: string;
  sku?: string;
  employeeId?: string;
}

interface NavMatch {
  type: "page";
  href: string;
  label: string;
}

type Entry = SearchResult | NavMatch;

const typeLabels: Record<string, string> = {
  page: "Page",
  project: "Project",
  site: "Site",
  customer: "Customer",
  product: "SKU",
  employee: "Team",
};

const typeRoutes: Record<string, string> = {
  project: "/projects",
  site: "/sites",
  customer: "/customers",
  product: "/inventory/products",
  employee: "/team",
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [dataResults, setDataResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { data: session } = useSession();
  const permissions = useMemo(() => (session?.user?.permissions as Permission[] | undefined) || [], [session]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Pages whose label matches what's typed — lets the search double as a page finder.
  const navResults: NavMatch[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    const matches: NavMatch[] = [];
    for (const group of navigation) {
      for (const item of group.items) {
        if (item.permission && !permissions.includes(item.permission)) continue;
        if (item.label.toLowerCase().includes(q)) matches.push({ type: "page", href: item.href, label: item.label });
      }
    }
    return matches.slice(0, 5);
  }, [query, permissions]);

  const entries: Entry[] = [...navResults, ...dataResults];

  function handleSearch(value: string) {
    setQuery(value);
    setHighlighted(0);
    clearTimeout(timerRef.current);
    if (value.length < 2) {
      setDataResults([]);
      setOpen(value.trim().length > 0);
      return;
    }
    setOpen(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
        const json = await res.json();
        setDataResults(json.data?.results || []);
      } catch {
        setDataResults([]);
      }
    }, 250);
  }

  function go(entry: Entry) {
    setOpen(false);
    setQuery("");
    if (entry.type === "page") {
      router.push(entry.href);
    } else {
      router.push(typeRoutes[entry.type] || "/app");
    }
  }

  function keyOf(entry: Entry) {
    return entry.type === "page" ? `page-${entry.href}` : `${entry.type}-${entry._id}`;
  }

  function labelOf(entry: Entry) {
    return entry.type === "page" ? entry.label : getLabel(entry);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || entries.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, entries.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const entry = entries[highlighted] ?? entries[0];
      if (entry) go(entry);
    }
  }

  const getLabel = (r: SearchResult) =>
    r.name || r.companyName || r.projectId || r.siteId || r.sku || r.employeeId || "—";

  return (
    <div ref={ref} className="relative">
      <label className="flex items-center gap-2 border border-paper-300 bg-paper-100 px-2.5 py-2 text-ink-400 focus-within:border-ink-700 focus-within:bg-paper-50 transition-colors">
        <Search className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
        <input
          type="text"
          placeholder="Find a project, site, SKU or page…"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => query.trim().length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent outline-none text-ink-800 placeholder:text-ink-400 text-[16px] lg:text-[12.5px]"
        />
      </label>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 card shadow-lift">
          {entries.length === 0 ? (
            <div className="px-3 py-3 text-[12px] text-ink-400">No matches</div>
          ) : (
            <div className="max-h-72 overflow-y-auto py-1">
              {entries.map((entry, i) => {
                const key = keyOf(entry);
                const label = labelOf(entry);
                return (
                  <button
                    key={key}
                    onClick={() => go(entry)}
                    onMouseEnter={() => setHighlighted(i)}
                    className={clsx(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] transition-colors",
                      i === highlighted ? "bg-paper-200/80" : "hover:bg-paper-100"
                    )}
                  >
                    <span className="shrink-0 bg-paper-200 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-ink-500">
                      {typeLabels[entry.type] || entry.type}
                    </span>
                    <span className="truncate text-ink-800">{label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
