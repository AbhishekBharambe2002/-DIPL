import { Inventory } from "@/server/models/inventory";

export interface StockByWarehouse {
  warehouseId: string;
  name: string;
  value: number;
  lines: number;
  skus: number;
}

export interface LowStockLine {
  id: string;
  sku: string;
  name: string;
  unit: string;
  warehouse: string;
  quantity: number;
  reorderLevel: number;
}

export async function stockValuation() {
  const rows: {
    _id: unknown;
    name: string;
    value: number;
    lines: number;
    skus: unknown[];
  }[] = await Inventory.aggregate([
    { $match: { quantity: { $gt: 0 } } },
    { $lookup: { from: "products", localField: "product", foreignField: "_id", as: "p" } },
    { $unwind: "$p" },
    { $lookup: { from: "warehouses", localField: "warehouse", foreignField: "_id", as: "w" } },
    { $unwind: "$w" },
    {
      $group: {
        _id: "$w._id",
        name: { $first: "$w.name" },
        value: { $sum: { $multiply: ["$quantity", { $ifNull: ["$p.purchasePrice", 0] }] } },
        lines: { $sum: 1 },
        skus: { $addToSet: "$p._id" },
      },
    },
    { $sort: { value: -1 } },
  ]);

  const byWarehouse: StockByWarehouse[] = rows.map((r) => ({
    warehouseId: String(r._id),
    name: r.name,
    value: r.value,
    lines: r.lines,
    skus: r.skus.length,
  }));
  const allSkus = new Set(rows.flatMap((r) => r.skus.map(String)));

  return {
    total: byWarehouse.reduce((s, w) => s + w.value, 0),
    lines: byWarehouse.reduce((s, w) => s + w.lines, 0),
    skus: allSkus.size,
    byWarehouse,
  };
}

export async function lowStockLines(limit = 8): Promise<{ count: number; items: LowStockLine[] }> {
  const rows = await Inventory.aggregate([
    { $lookup: { from: "products", localField: "product", foreignField: "_id", as: "p" } },
    { $unwind: "$p" },
    { $match: { "p.isDeleted": { $ne: true } } },
    {
      $addFields: {
        threshold: { $ifNull: ["$p.reorderLevel", { $ifNull: ["$p.minimumStock", 0] }] },
      },
    },
    { $match: { $expr: { $lte: ["$quantity", "$threshold"] } } },
    { $lookup: { from: "warehouses", localField: "warehouse", foreignField: "_id", as: "w" } },
    { $unwind: "$w" },
    { $sort: { quantity: 1 } },
    {
      $facet: {
        count: [{ $count: "n" }],
        items: [{ $limit: limit }],
      },
    },
  ]);

  const res = rows[0] ?? { count: [], items: [] };
  return {
    count: res.count[0]?.n ?? 0,
    items: res.items.map(
      (r: {
        _id: unknown;
        p: { sku: string; name: string; unit: string };
        w: { name: string };
        quantity: number;
        threshold: number;
      }) => ({
        id: String(r._id),
        sku: r.p.sku,
        name: r.p.name,
        unit: r.p.unit,
        warehouse: r.w.name,
        quantity: r.quantity,
        reorderLevel: r.threshold,
      })
    ),
  };
}
