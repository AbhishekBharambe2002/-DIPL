import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import type { ProjectOverviewData } from "./project-overview";

const HEADER_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8E0D0" } };
const TOTAL_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3EDE0" } };
const OVER_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDEAEA" } };
const SUMMARY_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDEAEA" } };
const RUPEE_FMT = '"₹"#,##0';
const RED = { argb: "FFB42318" };
const GREEN = { argb: "FF1F7A4D" };
const INK = { argb: "FF16140E" };

// For sheets with no predefined columns — adds a new, styled header row.
function headerRow(sheet: ExcelJS.Worksheet, labels: string[]) {
  const row = sheet.addRow(labels);
  row.eachCell((cell) => {
    cell.font = { bold: true, size: 9, color: { argb: "FF6F5F52" } };
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: "middle" };
  });
  return row;
}

// For sheets where `worksheet.columns = [...{header}]` already created row 1 —
// styles that row instead of adding a duplicate.
function styleHeaderRow1(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true, size: 9, color: { argb: "FF6F5F52" } };
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: "middle" };
  });
  return row;
}

function titleBlock(sheet: ExcelJS.Worksheet, title: string, subtitle?: string) {
  sheet.addRow([]);
  const r = sheet.addRow([title]);
  r.font = { bold: true, size: 13, color: INK };
  if (subtitle) {
    const s = sheet.addRow([subtitle]);
    s.font = { size: 9, italic: true, color: { argb: "FF6F5F52" } };
  }
}

export async function buildProjectReportExcel(data: ProjectOverviewData): Promise<Buffer> {
  const { project, economics: e, materials, boq, costs, transactions, sites, tasks } = data;
  const p = project as unknown as {
    projectId: string;
    name: string;
    status: string;
    location?: string;
    projectType?: string;
    expectedCompletionDate?: string;
    customer?: { companyName: string };
    projectManager?: { name: string };
    projectEngineer?: { name: string };
  };

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "DIPL Hypercustomi software";
  workbook.created = new Date();

  // ── Summary sheet ──
  const summary = workbook.addWorksheet("Summary", { properties: { defaultColWidth: 22 } });
  summary.columns = [{ width: 26 }, { width: 22 }, { width: 22 }, { width: 22 }];

  try {
    const logoBuf = fs.readFileSync(path.join(process.cwd(), "public", "image.png"));
    const imageId = workbook.addImage({ buffer: logoBuf as unknown as ExcelJS.Buffer, extension: "png" });
    summary.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 50, height: 60 } });
  } catch {
    // logo missing — report still generates without it
  }
  summary.getRow(1).height = 46;
  const titleCell = summary.getCell("B1");
  titleCell.value = "DIPL";
  titleCell.font = { bold: true, size: 20, color: INK };
  summary.getCell("B2").value = `Project Report · Generated ${new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
  summary.getCell("B2").font = { size: 9, italic: true, color: { argb: "FF9A9286" } };

  summary.addRow([]);
  const nameRow = summary.addRow([p.name]);
  nameRow.font = { bold: true, size: 15, color: INK };
  summary.addRow([`${p.projectId}${p.customer ? " · " + p.customer.companyName : ""} · ${p.status.toUpperCase()}`]).font = {
    size: 10,
    color: { argb: "FF6F5F52" },
  };
  summary.addRow([]);

  const infoRow1 = summary.addRow(["Location", p.location || "—", "Type", p.projectType || "—"]);
  infoRow1.getCell(1).font = infoRow1.getCell(3).font = { size: 8.5, color: { argb: "FF9A9286" } };
  const infoRow2 = summary.addRow(["Project manager", p.projectManager?.name || "—", "Engineer", p.projectEngineer?.name || "—"]);
  infoRow2.getCell(1).font = infoRow2.getCell(3).font = { size: 8.5, color: { argb: "FF9A9286" } };
  summary.addRow([]);

  titleBlock(summary, "Live profit & loss", "Revenue recognised at today's completion, less cost actually incurred.");
  const pnl: [string, number][] = [
    ["Revenue earned to date", e.earned],
    ["Less: material consumed", -e.materialConsumed],
    ["Less: labour", -e.labour],
    ["Less: other costs", -e.other],
  ];
  for (const [label, val] of pnl) {
    const r = summary.addRow([label, val]);
    r.getCell(2).numFmt = RUPEE_FMT;
  }
  const contribRow = summary.addRow(["Live contribution", e.contribution]);
  contribRow.font = { bold: true, size: 11 };
  contribRow.getCell(2).numFmt = RUPEE_FMT;
  contribRow.getCell(2).font = { bold: true, size: 11, color: e.contribution >= 0 ? GREEN : RED };
  if (e.margin != null) {
    summary.addRow([`${(e.margin * 100).toFixed(1)}% margin on earned revenue`]).font = { size: 8.5, italic: true, color: { argb: "FF9A9286" } };
  }

  if (e.boq.lines > 0) {
    titleBlock(summary, "BOQ vs actual", "Spend measured against the tender allowance earned so far.");
    const over = (e.boq.materialVariance ?? 0) > 0;
    const rows: [string, number][] = [
      ["BOQ material allowance", e.boq.supply],
      [`Material allowance earned at ${e.progress}%`, e.boq.materialEarned],
      ["Actual material consumed", e.materialConsumed],
    ];
    for (const [label, val] of rows) {
      const r = summary.addRow([label, val]);
      r.getCell(2).numFmt = RUPEE_FMT;
    }
    const varRow = summary.addRow(["Material variance" + (over ? " (OVER BOQ)" : ""), e.boq.materialVariance ?? 0]);
    varRow.getCell(2).numFmt = RUPEE_FMT;
    varRow.font = { bold: true };
    varRow.getCell(2).font = { bold: true, color: over ? RED : GREEN };
    if (over) varRow.eachCell((c) => (c.fill = OVER_FILL));
  }

  // ── Summary box ──
  summary.addRow([]);
  const boxStart = summary.rowCount + 1;
  titleBlock(summary, "Summary");
  const boxRow = summary.addRow(["Total estimated value", e.contractValue, "Amount spent so far", e.totalCost]);
  boxRow.getCell(2).numFmt = RUPEE_FMT;
  boxRow.getCell(4).numFmt = RUPEE_FMT;
  const boxRow2 = summary.addRow(["Revenue earned", e.earned, "Live contribution", e.contribution]);
  boxRow2.getCell(2).numFmt = RUPEE_FMT;
  boxRow2.getCell(4).numFmt = RUPEE_FMT;
  boxRow2.getCell(4).font = { bold: true, color: e.contribution >= 0 ? GREEN : RED };
  const noteRow = summary.addRow([`${e.progress}% complete · ${(e.contractValue - e.totalCost).toLocaleString("en-IN")} (₹) of estimate not yet spent`]);
  noteRow.font = { italic: true, size: 8.5, color: { argb: "FF6F5F52" } };
  for (let r = boxStart; r <= summary.rowCount; r++) {
    summary.getRow(r).eachCell({ includeEmpty: true }, (cell) => {
      if (!cell.fill) cell.fill = SUMMARY_FILL;
    });
  }

  // ── Material position sheet ──
  const matSheet = workbook.addWorksheet("Material Position");
  matSheet.columns = [
    { header: "Code", key: "sku", width: 14 },
    { header: "Material", key: "name", width: 32 },
    { header: "Category", key: "category", width: 20 },
    { header: "Rate", key: "rate", width: 12 },
    { header: "Expected", key: "planned", width: 12 },
    { header: "Allocated", key: "allocated", width: 12 },
    { header: "Consumed", key: "consumed", width: 12 },
    { header: "Returned", key: "returned", width: 12 },
    { header: "Balance", key: "balance", width: 12 },
    { header: "Value", key: "balanceValue", width: 14 },
    { header: "Unit", key: "unit", width: 10 },
  ];
  styleHeaderRow1(matSheet);
  for (const m of materials) {
    const over = m.planned > 0 && m.allocated > m.planned;
    const row = matSheet.addRow({
      sku: m.sku,
      name: m.name,
      category: m.category,
      rate: m.rate,
      planned: m.planned || null,
      allocated: m.allocated || null,
      consumed: m.consumed || null,
      returned: m.returned || null,
      balance: m.balance || null,
      balanceValue: m.balanceValue || null,
      unit: m.unit,
    });
    row.getCell("rate").numFmt = RUPEE_FMT;
    row.getCell("balanceValue").numFmt = RUPEE_FMT;
    if (over) {
      row.eachCell((cell) => (cell.fill = OVER_FILL));
      row.font = { color: RED };
    }
  }
  const totalRow = matSheet.addRow({ sku: "TOTAL", allocated: e.materialAllocated, consumed: e.materialConsumed, balanceValue: e.atSite });
  totalRow.font = { bold: true };
  totalRow.eachCell((c) => (c.fill = TOTAL_FILL));
  totalRow.getCell("allocated").numFmt = RUPEE_FMT;
  totalRow.getCell("consumed").numFmt = RUPEE_FMT;
  totalRow.getCell("balanceValue").numFmt = RUPEE_FMT;

  // ── BOQ sheet ──
  if (boq.length > 0) {
    const boqSheet = workbook.addWorksheet("BOQ");
    boqSheet.columns = [
      { header: "Item No", key: "itemNo", width: 10 },
      { header: "Section", key: "section", width: 16 },
      { header: "Description", key: "description", width: 50 },
      { header: "Unit", key: "unit", width: 10 },
      { header: "Qty", key: "quantity", width: 10 },
      { header: "Supply rate", key: "supplyRate", width: 14 },
      { header: "Install rate", key: "installRate", width: 14 },
      { header: "Amount", key: "amount", width: 16 },
    ];
    styleHeaderRow1(boqSheet);
    for (const b of boq as unknown as { itemNo: string; section?: string; description: string; unit: string; quantity: number; supplyRate: number; installRate: number }[]) {
      const row = boqSheet.addRow({
        itemNo: b.itemNo,
        section: b.section ?? "",
        description: b.description,
        unit: b.unit,
        quantity: b.quantity,
        supplyRate: b.supplyRate,
        installRate: b.installRate,
        amount: b.quantity * (b.supplyRate + b.installRate),
      });
      row.getCell("supplyRate").numFmt = RUPEE_FMT;
      row.getCell("installRate").numFmt = RUPEE_FMT;
      row.getCell("amount").numFmt = RUPEE_FMT;
    }
    const boqTotal = boqSheet.addRow({ itemNo: "TOTAL", amount: e.boq.supply + e.boq.install });
    boqTotal.font = { bold: true };
    boqTotal.eachCell((c) => (c.fill = TOTAL_FILL));
    boqTotal.getCell("amount").numFmt = RUPEE_FMT;
  }

  // ── Cost entries sheet ──
  if (costs.length > 0) {
    const costSheet = workbook.addWorksheet("Cost Entries");
    costSheet.columns = [
      { header: "Date", key: "date", width: 14 },
      { header: "Type", key: "type", width: 14 },
      { header: "Description", key: "description", width: 50 },
      { header: "Amount", key: "amount", width: 16 },
    ];
    styleHeaderRow1(costSheet);
    for (const c of costs as unknown as { date: string; type: string; description: string; amount: number }[]) {
      const row = costSheet.addRow({ date: new Date(c.date).toLocaleDateString("en-IN"), type: c.type.toUpperCase(), description: c.description, amount: c.amount });
      row.getCell("amount").numFmt = RUPEE_FMT;
    }
  }

  // ── Movements sheet ──
  if (transactions.length > 0) {
    const moveSheet = workbook.addWorksheet("Movements");
    moveSheet.columns = [
      { header: "Date", key: "date", width: 14 },
      { header: "Movement", key: "type", width: 18 },
      { header: "Code", key: "sku", width: 14 },
      { header: "Material", key: "name", width: 32 },
      { header: "Qty", key: "quantity", width: 12 },
      { header: "Value", key: "value", width: 16 },
    ];
    styleHeaderRow1(moveSheet);
    for (const t of transactions as unknown as {
      createdAt: string;
      type: string;
      quantity: number;
      product?: { sku: string; name: string; unit: string; purchasePrice?: number };
    }[]) {
      const row = moveSheet.addRow({
        date: new Date(t.createdAt).toLocaleDateString("en-IN"),
        type: t.type.replace(/_/g, " "),
        sku: t.product?.sku ?? "",
        name: t.product?.name ?? "",
        quantity: `${t.quantity} ${t.product?.unit ?? ""}`.trim(),
        value: t.quantity * (t.product?.purchasePrice ?? 0),
      });
      row.getCell("value").numFmt = RUPEE_FMT;
    }
  }

  // ── Sites & tasks sheet ──
  if (sites.length > 0 || tasks.length > 0) {
    const infoSheet = workbook.addWorksheet("Sites & Tasks");
    infoSheet.columns = [{ width: 32 }, { width: 24 }, { width: 18 }, { width: 18 }];
    if (sites.length > 0) {
      titleBlock(infoSheet, "Sites");
      headerRow(infoSheet, ["Site ID", "Name", "City", "Status"]);
      for (const s of sites as unknown as { siteId: string; name: string; city?: string; status: string }[]) {
        infoSheet.addRow([s.siteId, s.name, s.city ?? "", s.status.replace(/_/g, " ")]);
      }
    }
    if (tasks.length > 0) {
      infoSheet.addRow([]);
      titleBlock(infoSheet, "Open tasks");
      headerRow(infoSheet, ["Title", "Priority", "Status", "Due date"]);
      for (const t of tasks as unknown as { title: string; status: string; priority: string; dueDate?: string }[]) {
        const overdue = t.dueDate && new Date(t.dueDate) < new Date();
        const row = infoSheet.addRow([t.title, t.priority, t.status.replace(/_/g, " "), t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-IN") : ""]);
        if (overdue) row.font = { color: RED };
      }
    }
  }

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
