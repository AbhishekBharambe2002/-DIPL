"use client";

import { useState } from "react";
import { Shield, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { useFetch } from "@/hooks/use-api";

interface Role {
  _id: string;
  name: string;
  code: string;
  description?: string;
  permissions?: string[];
  isSystem?: boolean;
  createdAt: string;
}

export default function RolesPage() {
  const [searchInput, setSearchInput] = useState("");
  const { data, loading, page, pages, total, setPage, setSearch } =
    useFetch<Role>("/api/roles");

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  const columns: Column<Role>[] = [
    { key: "name", label: "Name" },
    { key: "code", label: "Code" },
    { key: "description", label: "Description" },
    {
      key: "permissions",
      label: "Permissions",
      render: (row) => {
        const count = Array.isArray(row.permissions)
          ? row.permissions.length
          : 0;
        return `${count} permissions`;
      },
    },
    {
      key: "isSystem",
      label: "System",
      render: (row) =>
        row.isSystem ? (
          <StatusBadge status="active" className="" />
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Administration · access"
        title="Roles & permissions"
        description="What each role can see and do across the system."
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search roles..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full border border-paper-300 bg-paper-50 py-2 pl-9 pr-3 text-[13.5px] text-ink-900 placeholder:text-ink-400 focus:border-ink-700 focus:outline-none"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage="No roles found."
        pagination={{ page, pages, total, onPageChange: setPage }}
      />
    </div>
  );
}
