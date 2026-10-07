"use client";

import { Package, FolderKanban, MapPin, Wrench, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

const reports = [
  {
    title: "Inventory report",
    description: "Stock summary across all warehouses with reorder alerts.",
    icon: Package,
  },
  {
    title: "Project report",
    description: "Project status breakdown, budget and timeline analysis.",
    icon: FolderKanban,
  },
  {
    title: "Site report",
    description: "Site progress tracking and completion by stage.",
    icon: MapPin,
  },
  {
    title: "Service report",
    description: "Service request status and resolution analytics.",
    icon: Wrench,
  },
  {
    title: "Procurement report",
    description: "Purchase order summary and vendor spend analysis.",
    icon: ShoppingCart,
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Reporting"
        title="Reports"
        description="Operational reports across projects, sites, stock and service."
      />

      <div className="grid gap-px bg-paper-200 border border-paper-200 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report, i) => {
          const Icon = report.icon;
          return (
            <div key={report.title} className="bg-paper-50 p-6">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-[0.14em] text-ink-400">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Icon className="h-4 w-4 text-ink-400" strokeWidth={1.7} />
              </div>
              <h3 className="mt-4 font-serif text-[22px] leading-snug text-ink-900">{report.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">{report.description}</p>
              <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                Coming soon
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
