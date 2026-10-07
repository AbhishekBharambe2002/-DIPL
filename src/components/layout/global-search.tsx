"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

interface SearchResult {
  type: string;
  _id: string;
  name?: string;
  companyName?: string;
  projectId?: string;
  siteId?: string;
  sku?: string;
  employeeId?: string;
}

const typeLabels: Record<string, string> = {
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
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearch(value: string) {
    setQuery(value);
    clearTimeout(timerRef.current);
    if (value.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
        const json = await res.json();
        setResults(json.data?.results || []);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 250);
  }

  function handleSelect(r: SearchResult) {
    setOpen(false);
    setQuery("");
    router.push(typeRoutes[r.type] || "/app");
  }

  const getLabel = (r: SearchResult) =>
    r.name || r.companyName || r.projectId || r.siteId || r.sku || r.employeeId || "—";

  return (
    <div ref={ref} className="relative">
      <label className="flex items-center gap-2 border border-paper-300 bg-paper-100 px-2.5 py-2 text-ink-400 focus-within:border-ink-700 focus-within:bg-paper-50 transition-colors">
        <Search className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
        <input
          type="text"
          placeholder="Find a project, site or SKU…"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          className="w-full bg-transparent outline-none text-ink-800 placeholder:text-ink-400 text-[16px] lg:text-[12.5px]"
        />
      </label>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 card shadow-lift">
          {results.length === 0 ? (
            <div className="px-3 py-3 text-[12px] text-ink-400">No matches</div>
          ) : (
            <div className="max-h-72 overflow-y-auto py-1">
              {results.map((r) => (
                <button
                  key={`${r.type}-${r._id}`}
                  onClick={() => handleSelect(r)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] hover:bg-paper-100"
                >
                  <span className="shrink-0 bg-paper-200 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-ink-500">
                    {typeLabels[r.type] || r.type}
                  </span>
                  <span className="truncate text-ink-800">{getLabel(r)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
