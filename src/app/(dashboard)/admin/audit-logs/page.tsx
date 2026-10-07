"use client";

import { useState, useMemo } from "react";
import { ScrollText, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { useFetch } from "@/hooks/use-api";

interface AuditLog {
  _id: string;
  user?: { name: string } | string;
  action: string;
  module: string;
  createdAt: string;
}

const moduleOptions = [
  { value: "", label: "All Modules" },
  { value: "customers", label: "Customers" },
  { value: "vendors", label: "Vendors" },
  { value: "employees", label: "Employees" },
  { value: "projects", label: "Projects" },
  { value: "sites", label: "Sites" },
  { value: "inventory", label: "Inventory" },
  { value: "tasks", label: "Tasks" },
  { value: "users", label: "Users" },
  { value: "roles", label: "Roles" },
  { value: "service_requests", label: "Service Requests" },
];

export default function AuditLogsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");

  const extraParams = useMemo(
    () => (moduleFilter ? { module: moduleFilter } : undefined),
    [moduleFilter]
  );

  const { data, loading, page, pages, total, setPage, setSearch } =
    useFetch<AuditLog>("/api/audit-logs", extraParams);

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  function getUserName(row: AuditLog): string {
    if (!row.user) return "—";
    if (typeof row.user === "string") return row.user;
    return row.user.name || "—";
  }

  const columns: Column<AuditLog>[] = [
    {
      key: "user",
      label: "User",
      render: (row) => getUserName(row),
    },
    { key: "action", label: "Action" },
    { key: "module", label: "Module" },
    {
      key: "createdAt",
      label: "Date",
      render: (row) =>
        row.createdAt
          ? new Date(row.createdAt).toLocaleString()
          : "—",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Administration · append-only"
        title="Audit trail"
        description="Every create, update and status change — who, when, and what it was before."
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full border border-paper-300 bg-paper-50 py-2 pl-9 pr-3 text-[13.5px] text-ink-900 placeholder:text-ink-400 focus:border-ink-700 focus:outline-none"
          />
        </div>
        <select
          value={moduleFilter}
          onChange={(e) => {
            setModuleFilter(e.target.value);
            setPage(1);
          }}
          className="border border-paper-300 bg-paper-50 px-3 py-2 text-[13.5px] text-ink-900 placeholder:text-ink-400 focus:border-ink-700 focus:outline-none"
        >
          {moduleOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage="No audit logs found."
        pagination={{ page, pages, total, onPageChange: setPage }}
      />
    </div>
  );
}
