import mongoose from "mongoose";
import { ProjectMaterial } from "@/server/models/project-material";
import { StockTransaction } from "@/server/models/stock-transaction";

const FIELD: Record<string, "allocated" | "consumed" | "returned"> = {
  site_issue: "allocated",
  consumed: "consumed",
  site_return: "returned",
};

export async function applyToProjectMaterial(m: { type: string; project?: string; product: string; quantity: number; at?: Date }) {
  const field = FIELD[m.type];
  if (!field || !m.project) return;
  const at = m.at ?? new Date();
  await ProjectMaterial.updateOne(
    { project: m.project, product: m.product },
    {
      $inc: { [field]: m.quantity, balance: m.type === "site_issue" ? m.quantity : -m.quantity },
      $set: { lastMovementAt: at },
      ...(m.type === "site_issue" ? { $min: { firstIssuedAt: at } } : {}),
    },
    { upsert: true }
  );
}

// Atomically takes consumed/returned quantity out of the site balance; false if the site holds too little.
export async function takeFromSite(m: { type: "consumed" | "site_return"; project: string; product: string; quantity: number }) {
  const res = await ProjectMaterial.updateOne(
    { project: m.project, product: m.product, balance: { $gte: m.quantity } },
    { $inc: { [FIELD[m.type]]: m.quantity, balance: -m.quantity }, $set: { lastMovementAt: new Date() } }
  );
  return res.modifiedCount === 1;
}

export async function projectMaterialBalance(project: string, product: string) {
  const row = await ProjectMaterial.findOne({ project, product }).select("balance").lean<{ balance: number }>();
  return row?.balance ?? 0;
}

// Recalculates the whole collection from the stock ledger, which stays the source of truth.
export async function rebuildProjectMaterials() {
  const rows = await StockTransaction.aggregate<{
    _id: { project: mongoose.Types.ObjectId; product: mongoose.Types.ObjectId };
    allocated: number;
    consumed: number;
    returned: number;
    firstIssuedAt: Date | null;
    lastMovementAt: Date;
  }>([
    { $match: { project: { $ne: null }, type: { $in: Object.keys(FIELD) } } },
    {
      $group: {
        _id: { project: "$project", product: "$product" },
        allocated: { $sum: { $cond: [{ $eq: ["$type", "site_issue"] }, "$quantity", 0] } },
        consumed: { $sum: { $cond: [{ $eq: ["$type", "consumed"] }, "$quantity", 0] } },
        returned: { $sum: { $cond: [{ $eq: ["$type", "site_return"] }, "$quantity", 0] } },
        firstIssuedAt: { $min: { $cond: [{ $eq: ["$type", "site_issue"] }, "$createdAt", null] } },
        lastMovementAt: { $max: "$createdAt" },
      },
    },
  ]);

  // Planned quantities are not in the ledger, so reset only the ledger-derived totals.
  await ProjectMaterial.updateMany({}, { $set: { allocated: 0, consumed: 0, returned: 0, balance: 0 }, $unset: { firstIssuedAt: 1, lastMovementAt: 1 } });
  if (rows.length) {
    await ProjectMaterial.bulkWrite(
      rows.map((r) => ({
        updateOne: {
          filter: { project: r._id.project, product: r._id.product },
          update: {
            $set: {
              allocated: r.allocated,
              consumed: r.consumed,
              returned: r.returned,
              balance: r.allocated - r.consumed - r.returned,
              firstIssuedAt: r.firstIssuedAt ?? undefined,
              lastMovementAt: r.lastMovementAt,
            },
            $setOnInsert: { planned: 0 },
          },
          upsert: true,
        },
      }))
    );
  }
  await ProjectMaterial.deleteMany({ planned: { $lte: 0 }, allocated: 0 });
  return rows.length;
}

export interface PlannedItem {
  product: string;
  planned: number;
}

// Replaces a project's expected-material list. Products dropped from the list keep their ledger history.
export async function setPlannedMaterials(project: string, items: PlannedItem[]) {
  const keep = items.filter((i) => i.planned > 0);
  await ProjectMaterial.updateMany(
    { project, product: { $nin: keep.map((i) => i.product) } },
    { $set: { planned: 0 } }
  );
  if (keep.length) {
    await ProjectMaterial.bulkWrite(
      keep.map((i) => ({
        updateOne: {
          filter: { project, product: i.product },
          update: { $set: { planned: i.planned }, $setOnInsert: { allocated: 0, consumed: 0, returned: 0, balance: 0 } },
          upsert: true,
        },
      }))
    );
  }
  await ProjectMaterial.deleteMany({ project, planned: { $lte: 0 }, allocated: 0 });
}
