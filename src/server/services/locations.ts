import { Inventory } from "@/server/models/inventory";
import { Warehouse } from "@/server/models/warehouse";
import { Site } from "@/server/models/site";
import { StockTransaction } from "@/server/models/stock-transaction";
import { computeEconomics, SITE_MOVES } from "@/server/services/project-economics";

export interface PinSku {
  code: string;
  description: string;
  qty: number;
  unit: string;
  value: number;
}

export interface MapLocation {
  id: string;
  type: "WAREHOUSE" | "SITE";
  code: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  stockValue: number;
  skuCount: number;
  topSkus: PinSku[];
  status?: string;
  projectId?: string;
  projectCode?: string;
  projectName?: string;
  completionPct?: number;
  earned?: number;
  contribution?: number;
  materialVariance?: number | null;
}

type Line = { key: string; sku: string; name: string; unit: string; qty: number; value: number };

function summarise(lines: Line[]) {
  const held = lines.filter((l) => l.qty > 0);
  return {
    stockValue: held.reduce((s, l) => s + l.value, 0),
    skuCount: new Set(held.map((l) => l.sku)).size,
    topSkus: held
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .map((l) => ({ code: l.sku, description: l.name, qty: l.qty, unit: l.unit, value: l.value })),
  };
}

export async function mapLocations(): Promise<MapLocation[]> {
  const [warehouses, sites, whLines, siteLines, { economics }] = await Promise.all([
    Warehouse.find({ isDeleted: { $ne: true } }).lean<
      { _id: unknown; name: string; location?: string; latitude?: number; longitude?: number; status: string }[]
    >(),
    Site.find({ isDeleted: { $ne: true } })
      .populate("project", "projectId name")
      .lean<
        {
          _id: unknown;
          siteId: string;
          name: string;
          address?: string;
          city?: string;
          latitude?: number;
          longitude?: number;
          status: string;
          project?: { _id: unknown; projectId: string; name: string };
        }[]
      >(),
    Inventory.aggregate([
      { $match: { quantity: { $gt: 0 } } },
      { $lookup: { from: "products", localField: "product", foreignField: "_id", as: "p" } },
      { $unwind: "$p" },
      {
        $project: {
          warehouse: 1,
          quantity: 1,
          sku: "$p.sku",
          name: "$p.name",
          unit: "$p.unit",
          rate: { $ifNull: ["$p.purchasePrice", 0] },
        },
      },
    ]),
    StockTransaction.aggregate([
      { $match: { site: { $ne: null }, type: { $in: SITE_MOVES } } },
      {
        $group: {
          _id: { site: "$site", product: "$product" },
          net: {
            $sum: { $cond: [{ $eq: ["$type", "site_issue"] }, "$quantity", { $multiply: ["$quantity", -1] }] },
          },
        },
      },
      { $lookup: { from: "products", localField: "_id.product", foreignField: "_id", as: "p" } },
      { $unwind: "$p" },
    ]),
    computeEconomics(),
  ]);

  const out: MapLocation[] = [];

  for (const w of warehouses) {
    const lines: Line[] = whLines
      .filter((l) => String(l.warehouse) === String(w._id))
      .map((l) => ({ key: l.sku, sku: l.sku, name: l.name, unit: l.unit, qty: l.quantity, value: l.quantity * l.rate }));
    out.push({
      id: String(w._id),
      type: "WAREHOUSE",
      code: "WH",
      name: w.name,
      address: w.location ?? "",
      lat: w.latitude ?? null,
      lng: w.longitude ?? null,
      status: w.status,
      ...summarise(lines),
    });
  }

  for (const s of sites) {
    const lines: Line[] = siteLines
      .filter((l) => String(l._id.site) === String(s._id))
      .map((l) => ({
        key: l.p.sku,
        sku: l.p.sku,
        name: l.p.name,
        unit: l.p.unit,
        qty: l.net,
        value: l.net * (l.p.purchasePrice ?? 0),
      }));
    const eco = s.project ? economics.find((e) => e.id === String(s.project!._id)) : undefined;
    out.push({
      id: String(s._id),
      type: "SITE",
      code: s.siteId,
      name: s.name,
      address: [s.address, s.city].filter(Boolean).join(", "),
      lat: s.latitude ?? null,
      lng: s.longitude ?? null,
      status: s.status,
      projectId: s.project ? String(s.project._id) : undefined,
      projectCode: s.project?.projectId,
      projectName: s.project?.name,
      completionPct: eco?.progress ?? 0,
      earned: eco?.earned ?? 0,
      contribution: eco?.contribution ?? 0,
      materialVariance: eco?.boq.materialVariance ?? null,
      ...summarise(lines),
    });
  }

  return out;
}
