import mongoose from "mongoose";
import { Project } from "@/server/models/project";
import { StockTransaction } from "@/server/models/stock-transaction";
import { ProjectCost } from "@/server/models/project-cost";
import { BoqItem } from "@/server/models/boq-item";

export const SITE_MOVES = ["site_issue", "consumed", "site_return"] as const;

export interface MaterialRow {
  projectId: string;
  projectCode: string;
  productId: string;
  sku: string;
  name: string;
  unit: string;
  category: string;
  rate: number;
  allocated: number;
  consumed: number;
  returned: number;
  balance: number;
  balanceValue: number;
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

async function materialRows(ids: Ids): Promise<Omit<MaterialRow, "projectCode">[]> {
  const rows = await StockTransaction.aggregate([
    { $match: { project: { $in: ids }, type: { $in: SITE_MOVES } } },
    {
      $group: {
        _id: { project: "$project", product: "$product" },
        allocated: { $sum: { $cond: [{ $eq: ["$type", "site_issue"] }, "$quantity", 0] } },
        consumed: { $sum: { $cond: [{ $eq: ["$type", "consumed"] }, "$quantity", 0] } },
        returned: { $sum: { $cond: [{ $eq: ["$type", "site_return"] }, "$quantity", 0] } },
      },
    },
    { $lookup: { from: "products", localField: "_id.product", foreignField: "_id", as: "p" } },
    { $unwind: "$p" },
    { $lookup: { from: "categories", localField: "p.category", foreignField: "_id", as: "c" } },
  ]);

  return rows.map((r) => {
    const rate = r.p.purchasePrice ?? 0;
    const balance = Math.max(0, r.allocated - r.consumed - r.returned);
    return {
      projectId: String(r._id.project),
      productId: String(r._id.product),
      sku: r.p.sku,
      name: r.p.name,
      unit: r.p.unit,
      category: r.c[0]?.name ?? "",
      rate,
      allocated: r.allocated,
      consumed: r.consumed,
      returned: r.returned,
      balance,
      balanceValue: balance * rate,
    };
  });
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
