"use client";

import { clsx } from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  pagination?: {
    page: number;
    pages: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

export function DataTable<T extends object>({
  columns,
  data,
  keyField = "_id",
  loading,
  emptyMessage = "No data found",
  onRowClick,
  pagination,
}: DataTableProps<T>) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={clsx("th", col.className)}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className="td">
                      <div className="h-3.5 w-3/4 bg-paper-200 animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14 text-center text-[13px] text-ink-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={((row as Record<string, unknown>)[keyField] as string) || i}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={clsx("hover:bg-paper-100/80 transition-colors", onRowClick && "cursor-pointer")}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={clsx("td", col.className)}>
                      {col.render
                        ? col.render(row)
                        : ((row as Record<string, unknown>)[col.key] as ReactNode) ?? (
                            <span className="text-ink-400">—</span>
                          )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between border-t border-paper-200 px-4 py-2.5">
          <p className="text-[12px] text-ink-500 tnum">
            Page {pagination.page} of {pagination.pages} · {pagination.total} records
          </p>
          <div className="flex items-center gap-1">
            <button
              aria-label="Previous page"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              className="p-1.5 text-ink-500 hover:bg-paper-200 hover:text-ink-900 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              aria-label="Next page"
              disabled={pagination.page >= pagination.pages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              className="p-1.5 text-ink-500 hover:bg-paper-200 hover:text-ink-900 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
