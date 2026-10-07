"use client";

import { useState, useEffect, useCallback } from "react";

interface UseFetchResult<T> {
  data: T[];
  total: number;
  pages: number;
  loading: boolean;
  error: string | null;
  page: number;
  setPage: (p: number) => void;
  search: string;
  setSearch: (s: string) => void;
  refetch: () => void;
}

export function useFetch<T>(
  url: string,
  extraParams?: Record<string, string>
): UseFetchResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (extraParams) {
        for (const [k, v] of Object.entries(extraParams)) {
          if (v) params.set(k, v);
        }
      }

      const res = await fetch(`${url}?${params}`);
      const json = await res.json();

      if (json.success !== false) {
        setData(json.data || []);
        setTotal(json.pagination?.total || 0);
        setPages(json.pagination?.pages || 0);
      } else {
        setError(json.error?.message || "Failed to load data");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [url, page, search, extraParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, total, pages, loading, error, page, setPage, search, setSearch, refetch: fetchData };
}

export async function apiPost(url: string, data: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function apiPatch(url: string, data: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function apiFetch(url: string) {
  const res = await fetch(url);
  return res.json();
}
