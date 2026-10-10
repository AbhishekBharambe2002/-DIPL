import mongoose from "mongoose";
import { Product } from "@/server/models/product";
import { Material } from "@/server/models/material";
import { InventoryLog } from "@/server/models/inventory-log";
import { Inventory } from "@/server/models/inventory";

/**
 * "Expected materials" on a project can point at either catalog —
 * the original Product/SKU master, or the 393-item Material catalogue
 * imported from the Excel sheets (the one Inventory, Dispatched and
 * Procurement all use). This resolves an id against whichever one it
 * actually belongs to, so every screen that reads expected materials
 * shows the same thing regardless of which catalogue the item came from.
 */
export interface CatalogItem {
  _id: string;
  sku: string;
  name: string;
  unit: string;
  purchasePrice: number;
  category: string;
  available: number; // current stock, whichever catalogue it came from
  source: "product" | "material";
}

export async function resolveCatalogItems(ids: (string | mongoose.Types.ObjectId)[]): Promise<Map<string, CatalogItem>> {
  const idStrs = [...new Set(ids.map(String))].filter((i) => mongoose.isValidObjectId(i));
  const objIds = idStrs.map((i) => new mongoose.Types.ObjectId(i));
  const map = new Map<string, CatalogItem>();
  if (objIds.length === 0) return map;

  const [products, materials] = await Promise.all([
    Product.find({ _id: { $in: objIds } })
      .populate("category", "name")
      .lean(),
    Material.find({ _id: { $in: objIds } }).lean(),
  ]);

  const prodIds = products.map((p) => p._id);
  const prodStock = prodIds.length
    ? await Inventory.aggregate<{ _id: mongoose.Types.ObjectId; qty: number }>([
        { $match: { product: { $in: prodIds } } },
        { $group: { _id: "$product", qty: { $sum: "$quantity" } } },
      ])
    : [];
  const prodStockMap = new Map(prodStock.map((s) => [String(s._id), s.qty]));

  for (const p of products) {
    const cat = p.category as unknown as { name?: string } | null;
    map.set(String(p._id), {
      _id: String(p._id),
      sku: p.sku,
      name: p.name,
      unit: p.unit,
      purchasePrice: p.purchasePrice ?? 0,
      category: cat?.name ?? "",
      available: prodStockMap.get(String(p._id)) ?? 0,
      source: "product",
    });
  }

  const matIds = materials.map((m) => m._id);
  const logs = matIds.length ? await InventoryLog.find({ material: { $in: matIds } }).lean() : [];
  const logMap = new Map(logs.map((l) => [String(l.material), l]));
  for (const m of materials) {
    const log = logMap.get(String(m._id));
    map.set(String(m._id), {
      _id: String(m._id),
      sku: m.productId,
      name: m.name,
      unit: m.unit,
      purchasePrice: log?.purchasePrice ?? 0,
      category: m.category,
      available: log?.quantityToDispatch ?? 0,
      source: "material",
    });
  }

  return map;
}

/** True only if every id resolves to an active item in one of the two catalogues. */
export async function catalogItemsExist(ids: string[]): Promise<boolean> {
  const idStrs = [...new Set(ids)];
  if (idStrs.length === 0) return true;
  if (idStrs.some((i) => !mongoose.isValidObjectId(i))) return false;
  const objIds = idStrs.map((i) => new mongoose.Types.ObjectId(i));
  const [pCount, mCount] = await Promise.all([
    Product.countDocuments({ _id: { $in: objIds }, isDeleted: { $ne: true } }),
    Material.countDocuments({ _id: { $in: objIds }, isActive: true }),
  ]);
  return pCount + mCount === idStrs.length;
}
