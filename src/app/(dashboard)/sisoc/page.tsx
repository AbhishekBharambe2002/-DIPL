"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/hooks/use-api";
import { inrShort } from "@/lib/format";

interface Figures {
  supplier: { suppliers: number; purchased: number };
  input: { bills: number; skus: number };
  storage: { lines: number; value: number };
  output: { movements: number; consumed: number };
  customer: { projects: number; contribution: number };
}

const STAGES = [
  {
    key: "supplier",
    letter: "S",
    name: "Supplier",
    href: "/procurement",
    today: "Rates live in phone threads and the owner's memory. What a supplier charged three months ago has to be found by scrolling.",
    system: "Every supplier carries a purchase history by SKU. The rate on the last bill is offered the next time a PO is raised.",
    control: "Purchase order against a supplier and a project.",
  },
  {
    key: "input",
    letter: "I",
    name: "Input",
    href: "/invoices",
    today: "The bill goes to the accountant for GST. Nobody records what the material actually cost per unit, so stock has no value.",
    system: "The printed rate becomes the cost of that consignment. Inventory has a number against it from the moment it arrives.",
    control: "A person confirms every bill line before it posts.",
  },
  {
    key: "storage",
    letter: "S",
    name: "Storage",
    href: "/inventory",
    core: true,
    today: "Stock is wherever it was last seen. Site stores are informal. Material bought for one tower quietly gets used on another.",
    system: "Every unit sits at exactly one location. Closing stock can be valued at any moment without a physical count.",
    control: "Stock never moves without a ledger entry.",
  },
  {
    key: "output",
    letter: "O",
    name: "Output",
    href: "/inventory/stock-movements",
    today: "Material sent to site is treated as material spent. Balance at site is invisible, and returns are informal.",
    system: "Allocated, consumed, returned and balance are separate numbers. Only consumption touches project cost.",
    control: "A site can't consume more than it holds.",
  },
  {
    key: "customer",
    letter: "C",
    name: "Customer",
    href: "/profitability",
    today: "Whether a job made money is known months after it finishes, when the material bills are finally reconciled.",
    system: "Contribution per project, today. A job running over its BOQ material allowance is visible while there is still time to act.",
    control: "Live P&L per project against its BOQ.",
  },
] as const;

const QUESTIONS: [string, string][] = [
  ["Where was the material purchased from?", "Supplier"],
  ["At what purchase price?", "Input"],
  ["How much was received?", "Input"],
  ["Where is it right now?", "Storage"],
  ["Which project is it allocated to?", "Storage"],
  ["How much has been consumed?", "Output"],
  ["How much is still lying at site?", "Output"],
  ["How much has come back?", "Output"],
  ["What is the closing inventory worth?", "Storage"],
  ["What has the project cost, and what is it earning?", "Customer"],
];

const ROLES = [
  ["Store in-charge", "Web, warehouse", "Captures supplier bills, dispatches to site, receives returns", "Several times a day"],
  ["Site engineer", "Web or phone, on site", "Books consumption, logs visits, sends surplus back", "Daily"],
  ["Purchase", "Web", "Raises POs against suppliers and projects", "Weekly"],
  ["Owner / management", "Control room", "Watches stock value, project margin and BOQ variance", "On demand"],
];

function figure(f: Figures | null, key: string): [string, string, string] {
  if (!f) return ["—", "—", ""];
  switch (key) {
    case "supplier":
      return [`${f.supplier.suppliers} suppliers`, inrShort(f.supplier.purchased), "purchased to date"];
    case "input":
      return [`${f.input.bills} bills posted`, `${f.input.skus} SKUs`, "in the master list"];
    case "storage":
      return [`${f.storage.lines} stock lines`, inrShort(f.storage.value), "stock on hand incl. sites"];
    case "output":
      return [`${f.output.movements} movements`, inrShort(f.output.consumed), "consumed against projects"];
    default:
      return [`${f.customer.projects} projects`, inrShort(f.customer.contribution), "live contribution"];
  }
}

export default function SisocPage() {
  const [f, setF] = useState<Figures | null>(null);

  useEffect(() => {
    apiFetch("/api/sisoc").then((j) => j.success && setF(j.data));
  }, []);

  return (
    <div className="space-y-12">
      <PageHeader
        kicker="Operating model"
        title="SISOC — how control is kept"
        description="Supplier → Input → Storage → Output → Customer. Every number on every other page belongs to one of these five stages."
      />

      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="label">Live figures</span>
          <span className="h-1.5 w-1.5 rounded-full bg-pos animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-paper-200 border border-paper-200">
          {STAGES.map((s, i) => {
            const [count, value, sub] = figure(f, s.key);
            return (
              <Link
                key={s.key}
                href={s.href}
                className={clsx("relative p-5 transition-colors hover:bg-paper-100", "core" in s && s.core ? "bg-ink-900 text-paper-50 hover:bg-ink-800" : "bg-paper-50")}
              >
                <div className="flex items-center justify-between">
                  <span className={clsx("font-serif text-[40px] leading-none", "core" in s && s.core ? "text-paper-50" : "text-ink-900")}>{s.letter}</span>
                  {"core" in s && s.core && <span className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-60">core</span>}
                  {i < STAGES.length - 1 && <span className="hidden lg:block absolute -right-2 top-7 z-10 text-ink-400">→</span>}
                </div>
                <div className={clsx("mt-3 text-[13px] font-semibold", "core" in s && s.core ? "" : "text-ink-900")}>{s.name}</div>
                <div className={clsx("text-[12px] mt-0.5", "core" in s && s.core ? "opacity-70" : "text-ink-500")}>{count}</div>
                <div className="mt-3 font-serif text-[24px] leading-none tnum">{value}</div>
                <div className={clsx("text-[11px] mt-1", "core" in s && s.core ? "opacity-60" : "text-ink-400")}>{sub}</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <SectionHeader title="What changes at each stage" description="Left is how the work runs today. Right is what this system makes possible." />
        <div className="card divide-y divide-paper-200">
          {STAGES.map((s) => (
            <div key={s.key} className="grid grid-cols-1 md:grid-cols-[150px_1fr_1fr] gap-4 px-5 py-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center bg-ink-900 font-serif text-[20px] text-paper-50 shrink-0">{s.letter}</span>
                <span className="text-[14px] font-semibold text-ink-900">{s.name}</span>
              </div>
              <div>
                <div className="label">Today</div>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-600">{s.today}</p>
              </div>
              <div>
                <div className="label !text-pos">With the system</div>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-800">{s.system}</p>
                <p className="mt-2 text-[12px] text-ink-500">
                  <span className="font-semibold text-ink-700">Control point.</span> {s.control}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <SectionHeader title="The ten questions the model has to answer" description="Each one maps to a stage." />
          <ol className="card divide-y divide-paper-200">
            {QUESTIONS.map(([q, stage], i) => (
              <li key={q} className="flex items-center gap-4 px-5 py-3">
                <span className="tnum text-[11px] font-semibold text-ink-400 w-5">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1 text-[13.5px] text-ink-900">{q}</span>
                <span className="chip bg-paper-200 text-ink-600 ring-1 ring-paper-300">{stage}</span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <SectionHeader title="The operating model this implies" description="Who touches the system, from where, and how often." />
          <div className="card divide-y divide-paper-200">
            {ROLES.map(([role, where, what, when]) => (
              <div key={role} className="px-5 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[14px] font-semibold text-ink-900">{role}</span>
                  <span className="text-[11.5px] text-ink-400">{when}</span>
                </div>
                <div className="text-[12px] text-ink-500 mt-0.5">{where}</div>
                <p className="text-[13px] text-ink-700 mt-1.5">{what}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="bg-ink-900 text-paper-50 px-6 sm:px-8 py-8 sm:py-10">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-55">Why the middle S is the whole point</div>
        <h2 className="font-serif text-[26px] sm:text-[32px] leading-tight mt-2 max-w-2xl">
          Nothing here is transformed. The value is in custody and cost attribution.
        </h2>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed opacity-75">
          In a manufacturing SIPOC the middle box is where raw material becomes something else. Here, a 150mm MS pipe that
          arrives from a supplier is the same pipe that gets welded into a riser six weeks later. What matters is knowing
          where it is, what it cost, and which job it was used on.
        </p>
        <div className="mt-6 border-t border-paper-50/15 pt-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-55">The one rule everything else follows</div>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed opacity-85">
            Stock never moves without a ledger entry. Nothing in the application updates or deletes a posted movement — a
            correction is a new entry, never an edit.
          </p>
          <Link href="/inventory/stock-movements" className="mt-4 inline-block text-[13px] font-medium underline underline-offset-4 opacity-90 hover:opacity-100">
            See the stock ledger →
          </Link>
        </div>
      </section>
    </div>
  );
}
