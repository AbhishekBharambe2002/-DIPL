import fs from "fs";
import path from "path";
import { buildProjectReportPdf } from "../server/services/project-report-pdf";
import type { ProjectOverviewData } from "../server/services/project-overview";

// Presentable, fully self-consistent mock data — same shape the real overview endpoint
// returns, so this exercises the exact same PDF-building code real projects use.
const mock = {
  project: {
    projectId: "DIPL-2026-014",
    name: "Lotus Business Park — Fire Safety Installation",
    status: "active",
    location: "Baner, Pune",
    projectType: "New Installation",
    expectedCompletionDate: "2027-01-15",
    customer: { companyName: "Lotus Realty Developers" },
    projectManager: { name: "Rahul Deshmukh" },
    projectEngineer: { name: "Sneha Kulkarni" },
  },
  economics: {
    id: "sample",
    code: "DIPL-2026-014",
    name: "Lotus Business Park — Fire Safety Installation",
    status: "active",
    location: "Baner, Pune",
    progress: 72,
    contractValue: 3200000,
    earned: 2304000,
    materialAllocated: 1850000,
    materialConsumed: 1560000,
    materialReturned: 90000,
    atSite: 200000,
    labour: 280000,
    other: 84000,
    totalCost: 1924000,
    contribution: 380000,
    margin: 380000 / 2304000,
    boq: {
      lines: 7,
      supply: 2400000,
      install: 800000,
      materialEarned: 1728000,
      materialVariance: -168000,
      labourEarned: 576000,
      labourVariance: -296000,
    },
  },
  materials: [
    { projectId: "sample", projectCode: "DIPL-2026-014", productId: "m1", sku: "HYD-063", name: "Fire Hydrant Landing Valve 63mm", unit: "Nos", category: "Hydrant System", rate: 4200, planned: 40, allocated: 38, consumed: 34, returned: 1, balance: 3, balanceValue: 12600, source: "material" as const },
    { projectId: "sample", projectCode: "DIPL-2026-014", productId: "m2", sku: "PIPE-150", name: "MS 'C' Class Pipe 150mm", unit: "Mtr", category: "Pipes & Fittings", rate: 1850, planned: 500, allocated: 480, consumed: 440, returned: 8, balance: 32, balanceValue: 59200, source: "material" as const },
    { projectId: "sample", projectCode: "DIPL-2026-014", productId: "m3", sku: "SPR-068", name: "Sprinkler Head 68°C Pendent", unit: "Nos", category: "Sprinkler System", rate: 285, planned: 800, allocated: 770, consumed: 720, returned: 15, balance: 35, balanceValue: 9975, source: "material" as const },
    { projectId: "sample", projectCode: "DIPL-2026-014", productId: "m4", sku: "FACP-004", name: "Fire Alarm Control Panel 4 Zone", unit: "Nos", category: "Fire Alarm System", rate: 32500, planned: 2, allocated: 2, consumed: 2, returned: 0, balance: 0, balanceValue: 0, source: "material" as const },
    { projectId: "sample", projectCode: "DIPL-2026-014", productId: "m5", sku: "SMK-PHE", name: "Smoke Detector Photoelectric", unit: "Nos", category: "Fire Alarm System", rate: 950, planned: 220, allocated: 210, consumed: 188, returned: 4, balance: 18, balanceValue: 17100, source: "material" as const },
    { projectId: "sample", projectCode: "DIPL-2026-014", productId: "m6", sku: "EXT-ABC6", name: "Fire Extinguisher ABC 6kg", unit: "Nos", category: "Portable Extinguishers", rate: 2100, planned: 100, allocated: 118, consumed: 108, returned: 0, balance: 10, balanceValue: 21000, source: "material" as const },
    { projectId: "sample", projectCode: "DIPL-2026-014", productId: "m7", sku: "LED-EXIT", name: "Emergency LED Exit Sign", unit: "Nos", category: "Emergency Lighting", rate: 650, planned: 60, allocated: 55, consumed: 50, returned: 0, balance: 5, balanceValue: 3250, source: "material" as const },
  ],
  boq: [
    { _id: "b1", itemNo: "1.1", section: "Hydrant System", description: "Supply, installation & testing of 63mm single-headed landing valve (IS:5290)", unit: "Nos", quantity: 40, supplyRate: 3800, installRate: 650 },
    { _id: "b2", itemNo: "1.2", section: "Hydrant System", description: "Supply & laying of MS 'C' class pipe 150mm dia incl. fittings and painting", unit: "Mtr", quantity: 500, supplyRate: 1650, installRate: 320 },
    { _id: "b3", itemNo: "2.1", section: "Sprinkler System", description: "Supply & fixing of pendent sprinkler head 68°C, chrome plated", unit: "Nos", quantity: 800, supplyRate: 240, installRate: 45 },
    { _id: "b4", itemNo: "3.1", section: "Fire Alarm System", description: "Supply, installation & commissioning of 4-zone fire alarm control panel", unit: "Nos", quantity: 2, supplyRate: 28000, installRate: 4500 },
    { _id: "b5", itemNo: "3.2", section: "Fire Alarm System", description: "Supply & fixing of photoelectric smoke detector with base", unit: "Nos", quantity: 220, supplyRate: 820, installRate: 130 },
    { _id: "b6", itemNo: "4.1", section: "Portable Extinguishers", description: "Supply of ABC type portable fire extinguisher 6kg with wall bracket", unit: "Nos", quantity: 100, supplyRate: 1850, installRate: 250 },
    { _id: "b7", itemNo: "5.1", section: "Emergency Lighting", description: "Supply & fixing of LED emergency exit sign, 3hr battery backup", unit: "Nos", quantity: 60, supplyRate: 550, installRate: 100 },
  ],
  costs: [
    { _id: "c1", date: "2026-09-10", type: "labour", description: "Installation gang — hydrant risers & pipe fabrication", amount: 180000 },
    { _id: "c2", date: "2026-09-24", type: "labour", description: "Sprinkler & alarm wiring crew", amount: 100000 },
    { _id: "c3", date: "2026-09-15", type: "transport", description: "Material shifting — Goregaon warehouse to site", amount: 50000 },
    { _id: "c4", date: "2026-09-29", type: "overhead", description: "Site supervision & documentation", amount: 34000 },
  ],
  transactions: [
    { _id: "t1", type: "site_issue", quantity: 38, createdAt: "2026-10-05", product: { sku: "HYD-063", name: "Fire Hydrant Landing Valve 63mm", unit: "Nos", purchasePrice: 4200 } },
    { _id: "t2", type: "consumed", quantity: 300, createdAt: "2026-10-06", product: { sku: "PIPE-150", name: "MS 'C' Class Pipe 150mm", unit: "Mtr", purchasePrice: 1850 } },
    { _id: "t3", type: "site_issue", quantity: 770, createdAt: "2026-10-07", product: { sku: "SPR-068", name: "Sprinkler Head 68°C Pendent", unit: "Nos", purchasePrice: 285 } },
    { _id: "t4", type: "consumed", quantity: 150, createdAt: "2026-10-08", product: { sku: "SMK-PHE", name: "Smoke Detector Photoelectric", unit: "Nos", purchasePrice: 950 } },
    { _id: "t5", type: "site_issue", quantity: 118, createdAt: "2026-10-09", product: { sku: "EXT-ABC6", name: "Fire Extinguisher ABC 6kg", unit: "Nos", purchasePrice: 2100 } },
  ],
  sites: [{ _id: "s1", siteId: "SITE-014", name: "Lotus Business Park — Tower A", city: "Pune", status: "installation" }],
  tasks: [
    { _id: "tk1", title: "Sprinkler testing — Tower A floors 7-9", status: "in_progress", priority: "high", dueDate: "2026-10-30" },
    { _id: "tk2", title: "Fire alarm panel commissioning", status: "todo", priority: "medium", dueDate: "2026-11-14" },
  ],
} as unknown as ProjectOverviewData;

async function main() {
  const pdf = await buildProjectReportPdf(mock);
  const outDir = path.join(process.cwd(), "public");
  const outPath = path.join(outDir, "sample-report-DIPL.pdf");
  fs.writeFileSync(outPath, pdf);
  console.log(`Sample PDF written to ${outPath} (${pdf.length} bytes)`);
}

main().catch((err) => {
  console.error("Failed to generate sample report:", err);
  process.exit(1);
});
