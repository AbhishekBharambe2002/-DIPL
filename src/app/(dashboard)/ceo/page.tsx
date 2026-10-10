"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Send,
  ShoppingCart,
  Truck,
  FolderKanban,
  AlertTriangle,
  Clock,
  TrendingUp,
  Activity,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Chip } from "@/components/ui/status-badge";
import { apiFetch } from "@/hooks/use-api";
import { inr, inrShort, qty, shortDate } from "@/lib/format";

interface CeoData {
  dispatches: number;
  dispatchDetails: {
    _id: string;
    quantity: number;
    rate: number;
    value: number;
    date: string;
    project?: { projectId: string; name: string };
    material?: { name: string; unit: string };
  }[];
  posRaised: number;
  posRaisedDetails: {
    _id: string;
    orderNo: string;
    vendor?: { companyName: string };
    totalAmount: number;
    status: string;
    lines: { name: string }[];
  }[];
  posDueToday: number;
  posDueDetails: {
    _id: string;
    orderNo: string;
    vendor?: { companyName: string };
    totalAmount: number;
    status: string;
    expectedDate: string;
    project?: { projectId: string; name: string };
  }[];
  newProjects: number;
  newProjectDetails: {
    _id: string;
    projectId: string;
    name: string;
    status: string;
    contractValue?: number;
  }[];
  lowStock: number;
  pendingDeliveries: number;
  activeProjects: number;
  poValueToday: number;
}

export default function CeoDashboardPage() {
  const [data, setData] = useState<CeoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/dashboard/ceo").then((j) => {
      if (j.success) setData(j.data.today);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="CEO Dashboard" kicker="Executive Overview" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card-pad h-28 animate-pulse bg-paper-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader title="CEO Dashboard" kicker="Executive Overview" />
        <div className="card-pad text-center text-ink-400 py-16">Unable to load dashboard data.</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="CEO Dashboard"
        kicker="Executive Overview"
        description={`Today — ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`}
      />

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Dispatches today"
          value={data.dispatches}
          icon={Send}
          subtitle="Materials dispatched from inventory"
          tone={data.dispatches > 0 ? "pos" : "default"}
        />
        <KpiCard
          title="POs raised today"
          value={data.posRaised}
          icon={ShoppingCart}
          subtitle={data.poValueToday > 0 ? `Worth ${inrShort(data.poValueToday)}` : "No orders placed"}
          tone={data.posRaised > 0 ? "pos" : "default"}
        />
        <KpiCard
          title="Deliveries due today"
          value={data.posDueToday}
          icon={Truck}
          subtitle="POs expected to arrive today"
          tone={data.posDueToday > 0 ? "warn" : "default"}
        />
        <KpiCard
          title="New projects"
          value={data.newProjects}
          icon={FolderKanban}
          subtitle={`${data.activeProjects} active total`}
          tone={data.newProjects > 0 ? "pos" : "default"}
        />
        <KpiCard
          title="Low stock items"
          value={data.lowStock}
          icon={AlertTriangle}
          subtitle="Below reorder threshold"
          tone={data.lowStock > 0 ? "neg" : "pos"}
        />
        <KpiCard
          title="In transit"
          value={data.pendingDeliveries}
          icon={Clock}
          subtitle="Dispatched, awaiting site delivery"
          tone={data.pendingDeliveries > 0 ? "warn" : "default"}
        />
        <KpiCard
          title="Active projects"
          value={data.activeProjects}
          icon={TrendingUp}
          subtitle="Currently running"
        />
        <KpiCard
          title="Today's PO value"
          value={data.poValueToday > 0 ? inrShort(data.poValueToday) : "—"}
          icon={Activity}
          subtitle="Total purchase orders placed today"
        />
      </div>

      {/* ── Detail sections ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dispatches today */}
        <DetailSection
          title="Dispatches today"
          icon={<Send className="h-4 w-4" />}
          count={data.dispatches}
          empty="No dispatches today"
          link="/dispatches"
        >
          {data.dispatchDetails.map((d) => (
            <div key={d._id} className="flex items-center justify-between gap-3 py-2.5 border-b border-paper-100 last:border-0">
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-ink-900 truncate">
                  {d.material?.name ?? "—"}
                </div>
                <div className="text-[11.5px] text-ink-400">
                  {d.project?.name ?? "—"} · {qty(d.quantity, d.material?.unit)}
                </div>
              </div>
              <div className="text-[13px] font-medium text-ink-700 tnum shrink-0">{inr(d.value)}</div>
            </div>
          ))}
        </DetailSection>

        {/* POs raised today */}
        <DetailSection
          title="POs raised today"
          icon={<ShoppingCart className="h-4 w-4" />}
          count={data.posRaised}
          empty="No POs raised today"
          link="/procurement"
        >
          {data.posRaisedDetails.map((po) => (
            <div key={po._id} className="flex items-center justify-between gap-3 py-2.5 border-b border-paper-100 last:border-0">
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-ink-900 truncate">
                  {po.orderNo}
                </div>
                <div className="text-[11.5px] text-ink-400 truncate">
                  {po.vendor?.companyName ?? "—"} · {po.lines.length} item{po.lines.length !== 1 && "s"}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Chip tone={po.status === "delivered" ? "green" : po.status === "placed" ? "blue" : "slate"}>
                  {po.status}
                </Chip>
                <span className="text-[13px] font-medium text-ink-700 tnum">{inr(po.totalAmount)}</span>
              </div>
            </div>
          ))}
        </DetailSection>

        {/* Deliveries due today */}
        <DetailSection
          title="Deliveries due today"
          icon={<Truck className="h-4 w-4" />}
          count={data.posDueToday}
          empty="No deliveries expected today"
          link="/procurement"
        >
          {data.posDueDetails.map((po) => (
            <div key={po._id} className="flex items-center justify-between gap-3 py-2.5 border-b border-paper-100 last:border-0">
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-ink-900 truncate">
                  {po.orderNo}
                </div>
                <div className="text-[11.5px] text-ink-400 truncate">
                  {po.vendor?.companyName ?? "—"}
                  {po.project && <> · {po.project.name}</>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Chip tone="amber">{po.status}</Chip>
                <span className="text-[13px] font-medium text-ink-700 tnum">{inr(po.totalAmount)}</span>
              </div>
            </div>
          ))}
        </DetailSection>

        {/* New projects today */}
        <DetailSection
          title="New projects today"
          icon={<FolderKanban className="h-4 w-4" />}
          count={data.newProjects}
          empty="No new projects today"
          link="/projects"
        >
          {data.newProjectDetails.map((p) => (
            <Link
              key={p._id}
              href={`/projects/${p._id}`}
              className="flex items-center justify-between gap-3 py-2.5 border-b border-paper-100 last:border-0 hover:bg-paper-50 -mx-4 px-4 transition-colors"
            >
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-ink-900 truncate">
                  {p.name}
                </div>
                <div className="text-[11.5px] text-ink-400">{p.projectId}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Chip tone="green">{p.status}</Chip>
                {p.contractValue != null && (
                  <span className="text-[13px] font-medium text-ink-700 tnum">{inrShort(p.contractValue)}</span>
                )}
              </div>
            </Link>
          ))}
        </DetailSection>
      </div>
    </div>
  );
}

function DetailSection({
  title,
  icon,
  count,
  empty,
  link,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  empty: string;
  link: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-paper-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-ink-400">{icon}</span>
          <span className="text-[14px] font-semibold text-ink-900">{title}</span>
          {count > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-ink-900 text-paper-50 text-[11px] font-semibold tnum">
              {count}
            </span>
          )}
        </div>
        <Link href={link} className="text-[12px] text-brand-600 hover:text-brand-700 font-medium">
          View all →
        </Link>
      </div>
      <div className="px-5 py-2">
        {count === 0 ? (
          <div className="py-8 text-center text-[12.5px] text-ink-400">{empty}</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
