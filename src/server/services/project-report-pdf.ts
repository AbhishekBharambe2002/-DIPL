import PDFDocument from "pdfkit";
import path from "path";
import type { ProjectOverviewData } from "./project-overview";

// PDFKit's built-in fonts (Helvetica etc.) only cover WinAnsi — no ₹ glyph — so the PDF
// uses "Rs." instead of the ₹ symbol used on screen, to avoid missing-glyph boxes.
const rs = (n: number) => (n < 0 ? "-Rs. " : "Rs. ") + Math.round(Math.abs(n)).toLocaleString("en-IN");
const rsShort = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}Rs. ${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}Rs. ${(abs / 1e5).toFixed(2)} L`;
  if (abs >= 1e3) return `${sign}Rs. ${(abs / 1e3).toFixed(1)} K`;
  return `${sign}Rs. ${abs.toFixed(0)}`;
};
const qty = (n: number, unit?: string) => {
  const v = Math.abs(n % 1) < 0.005 ? Math.round(n).toLocaleString("en-IN") : n.toFixed(2);
  return unit ? `${v} ${unit}` : v;
};
const shortDate = (d: string | Date) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });

const PAGE_MARGIN = 40;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const BOTTOM_LIMIT = 841.89 - PAGE_MARGIN;
const INK = "#16140e";
const MUTED = "#6f5f52"; // approximates the app's ink-500 on warm paper
const FAINT = "#9a9286";
const LINE = "#e4ddd2";
const RULE = "#b8ad9c"; // darker — used for a table's own border, vs the lighter row dividers
const POS = "#1f7a4d";
const NEG = "#b42318";
const HEADER_BG = "#ece4d4";
const HIGHLIGHT_BG = "#fdeaea";

interface Col {
  label: string;
  width: number;
  align?: "left" | "right" | "center";
  render: (row: Record<string, unknown>) => string;
  color?: (row: Record<string, unknown>) => string | undefined;
  bold?: (row: Record<string, unknown>) => boolean;
}

function drawHeader(doc: PDFKit.PDFDocument) {
  try {
    doc.image(path.join(process.cwd(), "public", "image.png"), PAGE_MARGIN, 28, { width: 30 });
  } catch {
    // logo missing — report still generates without it
  }
  doc.font("Helvetica-Bold").fontSize(18).fillColor(INK).text("DIPL", PAGE_MARGIN + 38, 30);
  doc.font("Helvetica").fontSize(8).fillColor(FAINT).text("Fire safety · Goregaon", PAGE_MARGIN + 38, 50);
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(FAINT)
    .text(`Generated ${new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`, PAGE_MARGIN, 30, {
      width: CONTENT_WIDTH,
      align: "right",
    });
  doc.moveTo(PAGE_MARGIN, 68).lineTo(PAGE_WIDTH - PAGE_MARGIN, 68).strokeColor(LINE).lineWidth(1).stroke();
  doc.font("Helvetica-Bold").fontSize(9).fillColor(MUTED).text("PROJECT STATUS REPORT", PAGE_MARGIN, 76, { width: CONTENT_WIDTH, align: "center", characterSpacing: 1.5 });
  doc.y = 96;
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > BOTTOM_LIMIT) doc.addPage();
}

// `followedByRowHeight` reserves room for the table's header + first row too, so a
// section title never ends up alone at the bottom of a page with its table pushed over.
function sectionTitle(doc: PDFKit.PDFDocument, title: string, subtitle?: string, followedByRowHeight = 0) {
  ensureSpace(doc, 34 + (followedByRowHeight ? 18 + followedByRowHeight : 0));
  doc.font("Helvetica-Bold").fontSize(11.5).fillColor(INK).text(title.toUpperCase(), PAGE_MARGIN, doc.y, { characterSpacing: 0.4 });
  if (subtitle) {
    doc.font("Helvetica").fontSize(8.5).fillColor(MUTED).text(subtitle, PAGE_MARGIN, doc.y + 2, { width: CONTENT_WIDTH });
  }
  doc.moveDown(0.4);
}

/**
 * A fully gridded, bordered table — vertical rule between every column, a darker rule
 * above the header and below the last row, lighter rules between ordinary rows. This is
 * the one drawing primitive every table and every label/value block in the report uses,
 * so the whole document reads as one consistent, formal, lined document.
 */
function drawTable(doc: PDFKit.PDFDocument, columns: Col[], rows: Record<string, unknown>[], opts?: { rowHeight?: number }) {
  const rowHeight = opts?.rowHeight ?? 17;
  const colX: number[] = [];
  let cursor = PAGE_MARGIN;
  for (const c of columns) {
    colX.push(cursor);
    cursor += c.width;
  }
  const tableRight = cursor;
  const vLines = (top: number, bottom: number) => {
    doc.strokeColor(LINE).lineWidth(0.5);
    for (const cx of [...colX, tableRight]) doc.moveTo(cx, top).lineTo(cx, bottom).stroke();
  };
  const hLine = (y: number, color: string, width: number) => doc.moveTo(PAGE_MARGIN, y).lineTo(tableRight, y).strokeColor(color).lineWidth(width).stroke();

  function drawHeaderRow() {
    const y = doc.y;
    doc.fillColor(HEADER_BG).rect(PAGE_MARGIN, y, tableRight - PAGE_MARGIN, 18).fill();
    let x = PAGE_MARGIN;
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(MUTED);
    for (const c of columns) {
      doc.text(c.label.toUpperCase(), x + 5, y + 5, { width: c.width - 9, align: c.align ?? "left" });
      x += c.width;
    }
    hLine(y, RULE, 0.9);
    vLines(y, y + 18);
    hLine(y + 18, RULE, 0.7);
    doc.y = y + 18;
  }

  ensureSpace(doc, 18 + rowHeight);
  drawHeaderRow();

  rows.forEach((row, i) => {
    if (doc.y + rowHeight > BOTTOM_LIMIT) {
      doc.addPage();
      drawHeaderRow();
    }
    const y = doc.y;
    let x = PAGE_MARGIN;
    for (const c of columns) {
      const text = c.render(row);
      const color = c.color?.(row) ?? INK;
      doc.font(c.bold?.(row) ? "Helvetica-Bold" : "Helvetica").fontSize(8).fillColor(color);
      doc.text(text, x + 5, y + 4, { width: c.width - 9, align: c.align ?? "left" });
      x += c.width;
    }
    vLines(y, y + rowHeight);
    hLine(y + rowHeight, i === rows.length - 1 ? RULE : LINE, i === rows.length - 1 ? 0.9 : 0.5);
    doc.y = y + rowHeight;
  });

  doc.moveDown(1);
}

interface KV {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}

/** A formal two-column "Particulars / value" table, built on the same grid as every other table. */
function kvTable(doc: PDFKit.PDFDocument, rows: KV[], opts?: { labelWidth?: number; labelHeader?: string; valueHeader?: string; rowHeight?: number }) {
  const labelWidth = opts?.labelWidth ?? 300;
  const cols: Col[] = [
    { label: opts?.labelHeader ?? "Particulars", width: labelWidth, render: (r) => r.label as string, bold: (r) => !!r.bold },
    {
      label: opts?.valueHeader ?? "Amount (Rs.)",
      width: CONTENT_WIDTH - labelWidth,
      align: "right",
      render: (r) => r.value as string,
      bold: (r) => !!r.bold,
      color: (r) => r.color as string | undefined,
    },
  ];
  drawTable(doc, cols, rows as unknown as Record<string, unknown>[], { rowHeight: opts?.rowHeight ?? 17 });
}

export async function buildProjectReportPdf(data: ProjectOverviewData): Promise<Buffer> {
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

  const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  drawHeader(doc);

  // ── Project title ──
  doc.font("Helvetica-Bold").fontSize(16).fillColor(INK).text(p.name, PAGE_MARGIN, doc.y);
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(MUTED)
    .text(`${p.projectId}${p.customer ? " · " + p.customer.companyName : ""} · ${p.status.toUpperCase()}`, PAGE_MARGIN, doc.y + 2);
  doc.moveDown(0.7);

  // ── Project particulars ──
  kvTable(
    doc,
    [
      { label: "Location", value: p.location || "—" },
      { label: "Project type", value: p.projectType || "—" },
      { label: "Project manager", value: p.projectManager?.name || "—" },
      { label: "Site engineer", value: p.projectEngineer?.name || "—" },
      { label: "Expected completion", value: p.expectedCompletionDate ? shortDate(p.expectedCompletionDate) : "—" },
      { label: "Completion to date", value: `${e.progress}%` },
      { label: "Contract value", value: rsShort(e.contractValue) },
      { label: "Revenue earned to date", value: rsShort(e.earned) },
    ],
    { labelWidth: 220, labelHeader: "Particulars", valueHeader: "Details" }
  );
  doc.moveDown(0.6);

  // ── Live profit & loss ──
  sectionTitle(doc, "Live profit & loss", "Revenue recognised at today's completion, less cost actually incurred.", 17 * 5);
  kvTable(doc, [
    { label: "Revenue earned to date", value: rs(e.earned) },
    { label: "Less: material consumed", value: rs(-e.materialConsumed) },
    { label: "Less: labour", value: rs(-e.labour) },
    { label: "Less: other costs", value: rs(-e.other) },
    { label: "Live contribution", value: rs(e.contribution), bold: true, color: e.contribution >= 0 ? POS : NEG },
  ]);
  if (e.margin != null) {
    doc.font("Helvetica").fontSize(8).fillColor(FAINT).text(`${(e.margin * 100).toFixed(1)}% margin on earned revenue`, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH, align: "right" });
    doc.moveDown(0.6);
  }
  doc.moveDown(0.4);

  // ── BOQ vs actual ──
  if (e.boq.lines > 0) {
    sectionTitle(doc, "BOQ vs actual", "Spend measured against the tender allowance earned so far.", 17 * 5);
    const over = (e.boq.materialVariance ?? 0) > 0;
    kvTable(doc, [
      { label: "BOQ material allowance", value: rsShort(e.boq.supply) },
      { label: `Material allowance earned at ${e.progress}%`, value: rsShort(e.boq.materialEarned) },
      { label: "Actual material consumed", value: rsShort(e.materialConsumed) },
      {
        label: "Material variance",
        value: e.boq.materialVariance == null ? "—" : `${e.boq.materialVariance > 0 ? "+" : ""}${rsShort(e.boq.materialVariance)}${over ? "  (OVER BOQ)" : ""}`,
        bold: true,
        color: e.boq.materialVariance == null ? undefined : over ? NEG : POS,
      },
      { label: "Labour vs BOQ allowance", value: `${rsShort(e.labour)} of ${rsShort(e.boq.install)} total` },
    ]);
    doc.moveDown(1);
  }

  // ── Material position ──
  sectionTitle(doc, "Material position", "Expected is what the job was planned to need; Allocated/Consumed/Returned come from the stock ledger. Rows over their expected quantity are highlighted.");
  const matCols: Col[] = [
    { label: "Material", width: 140, render: (r) => `${r.name as string}\n${r.sku as string}` },
    { label: "Rate", width: 46, align: "right", render: (r) => rs(r.rate as number) },
    { label: "Expected", width: 50, align: "right", render: (r) => ((r.planned as number) ? qty(r.planned as number, r.unit as string) : "—") },
    { label: "Alloc.", width: 62, align: "right", render: (r) => ((r.allocated as number) ? qty(r.allocated as number, r.unit as string) : "—") },
    { label: "Consumed", width: 54, align: "right", render: (r) => qty(r.consumed as number, r.unit as string) },
    { label: "Return", width: 54, align: "right", render: (r) => ((r.returned as number) ? qty(r.returned as number, r.unit as string) : "—") },
    { label: "Balance", width: 48, align: "right", render: (r) => ((r.balance as number) ? qty(r.balance as number, r.unit as string) : "—") },
    { label: "Value", width: 61, align: "right", render: (r) => ((r.balanceValue as number) ? rs(r.balanceValue as number) : "—") },
  ];
  const overRows = materials.filter((m) => m.planned > 0 && m.allocated > m.planned);
  drawTable(
    doc,
    matCols.map((c) => ({
      ...c,
      color: (r) => (c.label === "Material" ? undefined : (r.planned as number) > 0 && (r.allocated as number) > (r.planned as number) ? NEG : undefined),
    })),
    materials as unknown as Record<string, unknown>[],
    { rowHeight: 27 }
  );
  // Totals in money — the only thing that sums meaningfully across rows of mixed units.
  // x-offsets mirror matCols so each figure lines up under its own column, closing the table above.
  ensureSpace(doc, 20);
  {
    const y = doc.y;
    let x = PAGE_MARGIN;
    const colX: number[] = [];
    for (const c of matCols) {
      colX.push(x);
      x += c.width;
    }
    const tableRight = x;
    doc.fillColor(HEADER_BG).rect(PAGE_MARGIN, y, tableRight - PAGE_MARGIN, 18).fill();
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(INK);
    doc.text("TOTAL", colX[0] + 5, y + 5, { width: matCols[0].width - 9 });
    doc.text(rsShort(e.materialAllocated), colX[3] + 5, y + 5, { width: matCols[3].width - 9, align: "right" });
    doc.text(rsShort(e.materialConsumed), colX[4] + 5, y + 5, { width: matCols[4].width - 9, align: "right" });
    doc.text(rsShort(e.atSite), colX[7] + 5, y + 5, { width: matCols[7].width - 9, align: "right" });
    doc.strokeColor(LINE).lineWidth(0.5);
    for (const cx of [...colX, tableRight]) doc.moveTo(cx, y).lineTo(cx, y + 18).stroke();
    doc.moveTo(PAGE_MARGIN, y + 18).lineTo(tableRight, y + 18).strokeColor(RULE).lineWidth(0.9).stroke();
    doc.y = y + 18;
  }
  doc.moveDown(0.8);
  if (overRows.length > 0) {
    ensureSpace(doc, 14);
    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor(NEG)
      .text(`${overRows.length} material${overRows.length === 1 ? "" : "s"} dispatched beyond the expected quantity.`, PAGE_MARGIN, doc.y);
    doc.moveDown(0.8);
  }

  // ── BOQ bill of quantities ──
  if (boq.length > 0) {
    sectionTitle(doc, "BOQ — bill of quantities", `${boq.length} line items · total BOQ value ${rsShort(e.boq.supply + e.boq.install)}`, 26);
    const boqCols2: Col[] = [
      { label: "Item", width: 35, render: (r) => r.itemNo as string },
      { label: "Description", width: 220, render: (r) => r.description as string },
      { label: "Unit", width: 40, render: (r) => r.unit as string },
      { label: "Qty", width: 45, align: "right", render: (r) => qty(r.quantity as number) },
      { label: "Supply", width: 55, align: "right", render: (r) => rs(r.supplyRate as number) },
      { label: "Install", width: 55, align: "right", render: (r) => rs(r.installRate as number) },
      { label: "Amount", width: 65, align: "right", render: (r) => rs((r.quantity as number) * ((r.supplyRate as number) + (r.installRate as number))) },
    ];
    drawTable(doc, boqCols2, boq as unknown as Record<string, unknown>[], { rowHeight: 26 });
  }

  // ── Cost entries ──
  if (costs.length > 0) {
    sectionTitle(doc, "Cost entries", "Labour, transport and overhead booked against this project.");
    const costCols: Col[] = [
      { label: "Date", width: 55, render: (r) => shortDate(r.date as string) },
      { label: "Type", width: 70, render: (r) => (r.type as string).toUpperCase() },
      { label: "Description", width: 260, render: (r) => r.description as string },
      { label: "Amount", width: 70, align: "right", render: (r) => rs(r.amount as number) },
    ];
    drawTable(doc, costCols, costs as unknown as Record<string, unknown>[], { rowHeight: 16 });
  }

  // ── Recent movements ──
  if (transactions.length > 0) {
    sectionTitle(doc, "Recent movements", "Latest stock movements recorded against this project.");
    const moveCols: Col[] = [
      { label: "Date", width: 55, render: (r) => shortDate(r.createdAt as string) },
      { label: "Movement", width: 90, render: (r) => (r.type as string).replace(/_/g, " ") },
      {
        label: "Material",
        width: 195,
        render: (r) => {
          const prod = r.product as { sku?: string; name?: string } | undefined;
          return prod ? `${prod.sku ?? ""} ${prod.name ?? ""}`.trim() : "—";
        },
      },
      {
        label: "Qty",
        width: 60,
        align: "right",
        render: (r) => qty(r.quantity as number, (r.product as { unit?: string } | undefined)?.unit),
      },
      {
        label: "Value",
        width: 70,
        align: "right",
        render: (r) => rs((r.quantity as number) * ((r.product as { purchasePrice?: number } | undefined)?.purchasePrice ?? 0)),
      },
    ];
    drawTable(doc, moveCols, transactions as unknown as Record<string, unknown>[], { rowHeight: 16 });
  }

  // ── Sites & tasks ──
  if (sites.length > 0) {
    sectionTitle(doc, "Sites", "Buildings and locations under this project.");
    const siteCols: Col[] = [
      { label: "Site ID", width: 60, render: (r) => r.siteId as string },
      { label: "Name", width: 260, render: (r) => r.name as string },
      { label: "City", width: 100, render: (r) => (r.city as string) || "—" },
      { label: "Status", width: 95, render: (r) => (r.status as string).replace(/_/g, " ").toUpperCase() },
    ];
    drawTable(doc, siteCols, sites as unknown as Record<string, unknown>[], { rowHeight: 16 });
  }
  if (tasks.length > 0) {
    sectionTitle(doc, "Open tasks", "Work still to do on this project.");
    const taskCols: Col[] = [
      { label: "Task", width: 265, render: (r) => r.title as string },
      { label: "Priority", width: 70, render: (r) => (r.priority as string).toUpperCase() },
      { label: "Status", width: 85, render: (r) => (r.status as string).replace(/_/g, " ").toUpperCase() },
      { label: "Due date", width: 95, render: (r) => ((r.dueDate as string) ? shortDate(r.dueDate as string) : "—") },
    ];
    drawTable(
      doc,
      taskCols.map((c) => ({ ...c, color: (r) => (r.dueDate && new Date(r.dueDate as string) < new Date() ? NEG : undefined) })),
      tasks as unknown as Record<string, unknown>[],
      { rowHeight: 16 }
    );
  }

  // ── Summary ──
  const summaryRows: KV[] = [
    { label: "Total estimated value (contract / BOQ)", value: rsShort(e.contractValue) },
    { label: "Amount spent so far", value: rsShort(e.totalCost) },
    { label: "Revenue earned to date", value: rsShort(e.earned) },
    { label: "Live contribution", value: rsShort(e.contribution), bold: true, color: e.contribution >= 0 ? POS : NEG },
  ];
  const summaryRowHeight = 18;
  const summaryHeight = 18 + summaryRowHeight * summaryRows.length;
  sectionTitle(doc, "Summary", undefined, summaryRowHeight * summaryRows.length);
  ensureSpace(doc, summaryHeight + 16);
  const summaryTop = doc.y;
  doc.fillColor(HIGHLIGHT_BG).rect(PAGE_MARGIN, summaryTop, CONTENT_WIDTH, summaryHeight).fill();
  kvTable(doc, summaryRows, { labelWidth: 340, rowHeight: summaryRowHeight });
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(MUTED)
    .text(`${e.progress}% complete · ${rsShort(e.contractValue - e.totalCost)} of estimate not yet spent`, PAGE_MARGIN, doc.y + 4, { width: CONTENT_WIDTH });
  doc.moveDown(1);

  // Footer page numbers. y=812 sits below the normal bottom margin (801.89), and PDFKit's
  // .text() silently starts a *new* page rather than draw past the margin — so the bottom
  // margin is zeroed for this one draw on each already-finished page.
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.page.margins.bottom = 0;
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(FAINT)
      .text(`DIPL Hypercustomi software · Page ${i + 1} of ${range.count}`, PAGE_MARGIN, 812, { width: CONTENT_WIDTH, align: "center" });
  }

  doc.end();
  return done;
}
