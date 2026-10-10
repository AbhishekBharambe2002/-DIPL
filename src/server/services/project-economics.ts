import mongoose from "mongoose";
import { Project } from "@/server/models/project";
import { ProjectMaterial } from "@/server/models/project-material";
import { ProjectSiteLog } from "@/server/models/project-site-log";
import { ProjectCost } from "@/server/models/project-cost";
import { BoqItem } from "@/server/models/boq-item";
import { resolveCatalogItems } from "@/server/services/catalog";

export const SITE_MOVES = ["site_issue", "consumed", "site_return", "dispatch", "returned"] as const;

export interface MaterialRow {
  projectId: string;
  projectCode: string;
  productId: string;
  sku: string;
  name: string;
  unit: string;
  category: string;
  rate: number;
  planned: number;
  allocated: number;
  consumed: number;
  returned: number;
  balance: number;
  balanceValue: number;
  /** which catalogue this came from — the old Product/SKU master, or the Material catalogue */
  source: "product" | "material";
}

export interface ProjectEconomics {
  id: string;
  code: string;
  name: string;
  status: string;
  location: string;
  progress: number;
  contractValue: number;
  earned: number;
  materialAllocated: number;
  materialConsumed: number;
  materialReturned: number;
  atSite: number;
  labour: number;
  other: number;
  totalCost: number;
  contribution: number;
  margin: number | null;
  boq: {
    lines: number;
    supply: number;
    install: number;
    materialEarned: number;
    materialVariance: number | null;
    labourEarned: number;
    labourVariance: number | null;
  };
}

type Ids = mongoose.Types.ObjectId[];

/**
 * Build material rows from BOTH old ProjectMaterial AND new ProjectSiteLog collections.
 * Old rows come from ProjectMaterial, resolved against whichever catalogue the
 * item actually belongs to — the old Product/SKU master or the 393-item Material
 * catalogue (Expected materials can point at either one).
 * New rows come from ProjectSiteLog → materials (the 393 Excel-imported items).
 */
async function materialRows(ids: Ids): Promise<Omit<MaterialRow, "projectCode">[]> {
  // ── Old system: ProjectMaterial, resolved against either catalogue ──
  const oldDocs = await ProjectMaterial.find({ project: { $in: ids } }).lean();
  const catalog = await resolveCatalogItems(oldDocs.map((r) => r.product));

  const result: Omit<MaterialRow, "projectCode">[] = oldDocs
    .map((r) => {
      const item = catalog.get(String(r.product));
      if (!item) return null; // catalogue item was deleted since
      const rate = item.purchasePrice;
      const balance = Math.max(0, r.balance);
      return {
        projectId: String(r.project),
        productId: String(r.product),
        sku: item.sku,
        name: item.name,
        unit: item.unit,
        category: item.category,
        rate,
        planned: r.planned ?? 0,
        allocated: r.allocated,
        consumed: r.consumed,
        returned: r.returned,
        balance,
        balanceValue: balance * rate,
        source: item.source,
      };
    })
    .filter((r): r is NonNullable<typeof r> => !!r);

  // ── New system: ProjectSiteLog → materials ──
  const newRows = await ProjectSiteLog.aggregate([
    { $match: { project: { $in: ids } } },
    {
      $group: {
        _id: { project: "$project", material: "$material", productId: "$productId" },
        rate: { $first: "$rate" },
        // "In transit" dispatches have already left inventory, but only count toward
        // Allocated once delivery at site is confirmed.
        allocated: {
          $sum: {
            $cond: [{ $and: [{ $eq: ["$type", "dispatch"] }, { $eq: ["$deliveryStatus", "delivered"] }] }, "$quantity", 0],
          },
        },
        consumed: { $sum: { $cond: [{ $eq: ["$type", "consumed"] }, "$quantity", 0] } },
        returned: { $sum: { $cond: [{ $eq: ["$type", "returned"] }, "$quantity", 0] } },
      },
    },
    { $lookup: { from: "materials", localField: "_id.material", foreignField: "_id", as: "m" } },
    { $unwind: "$m" },
  ]);

  for (const r of newRows) {
    const balance = Math.max(0, r.allocated - r.consumed - r.returned);
    result.push({
      projectId: String(r._id.project),
      productId: r._id.productId,
      sku: r._id.productId,
      name: r.m.name,
      unit: r.m.unit,
      category: r.m.category,
      rate: r.rate,
      planned: 0,
      allocated: r.allocated,
      consumed: r.consumed,
      returned: r.returned,
      balance,
      balanceValue: balance * r.rate,
      source: "material" as const,
    });
  }

  return result;
}

export async function computeEconomics(filter: Record<string, unknown> = {}) {
  const projects = await Project.find({ isDeleted: { $ne: true }, ...filter })
    .select("projectId name status location progress budget")
    .sort({ budget: -1 })
    .lean<
      { _id: mongoose.Types.ObjectId; projectId: string; name: string; status: string; location?: string; progress?: number; budget?: number }[]
    >();
  const ids = projects.map((p) => p._id);

  const [materials, costs, boq] = await Promise.all([
    materialRows(ids),
    ProjectCost.aggregate<{ _id: { project: mongoose.Types.ObjectId; type: string }; amount: number }>([
      { $match: { project: { $in: ids } } },
      { $group: { _id: { project: "$project", type: "$type" }, amount: { $sum: "$amount" } } },
    ]),
    BoqItem.aggregate<{ _id: mongoose.Types.ObjectId; lines: number; supply: number; install: number }>([
      { $match: { project: { $in: ids } } },
      {
        $group: {
          _id: "$project",
          lines: { $sum: 1 },
          supply: { $sum: { $multiply: ["$quantity", "$supplyRate"] } },
          install: { $sum: { $multiply: ["$quantity", "$installRate"] } },
        },
      },
    ]),
  ]);

  const codeById = new Map(projects.map((p) => [String(p._id), p.projectId]));
  const allRows: MaterialRow[] = materials.map((m) => ({ ...m, projectCode: codeById.get(m.projectId) ?? "" }));

  const economics: ProjectEconomics[] = projects.map((p) => {
    const id = String(p._id);
    const mine = allRows.filter((r) => r.projectId === id);
    const b = boq.find((x) => String(x._id) === id);
    const costOf = (t: string) =>
      costs.filter((c) => String(c._id.project) === id && c._id.type === t).reduce((s, c) => s + c.amount, 0);

    const progress = p.progress ?? 0;
    const pct = progress / 100;
    const contractValue = b ? b.supply + b.install : p.budget ?? 0;
    const earned = contractValue * pct;
    const materialConsumed = mine.reduce((s, r) => s + r.consumed * r.rate, 0);
    const labour = costOf("labour");
    const other = costOf("transport") + costOf("overhead") + costOf("other");
    const totalCost = materialConsumed + labour + other;
    const contribution = earned - totalCost;
    const materialEarned = (b?.supply ?? 0) * pct;
    const labourEarned = (b?.install ?? 0) * pct;

    return {
      id,
      code: p.projectId,
      name: p.name,
      status: p.status,
      location: p.location ?? "",
      progress,
      contractValue,
      earned,
      materialAllocated: mine.reduce((s, r) => s + r.allocated * r.rate, 0),
      materialConsumed,
      materialReturned: mine.reduce((s, r) => s + r.returned * r.rate, 0),
      atSite: mine.reduce((s, r) => s + r.balanceValue, 0),
      labour,
      other,
      totalCost,
      contribution,
      margin: earned > 0 ? contribution / earned : null,
      boq: {
        lines: b?.lines ?? 0,
        supply: b?.supply ?? 0,
        install: b?.install ?? 0,
        materialEarned,
        materialVariance: b && earned > 0 ? materialConsumed - materialEarned : null,
        labourEarned,
        labourVariance: b && earned > 0 ? labour - labourEarned : null,
      },
    };
  });

  return { economics, materials: allRows };
}
