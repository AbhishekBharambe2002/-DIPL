import mongoose from "mongoose";
import { Inventory } from "@/server/models/inventory";
import { StockTransaction } from "@/server/models/stock-transaction";
import { createAuditLog } from "@/lib/audit";
import { applyToProjectMaterial, projectMaterialBalance, takeFromSite } from "@/server/services/project-materials";

export const PROJECT_TYPES = ["site_issue", "consumed", "site_return"];
const INCREASE_TYPES = ["purchase", "stock_in", "site_return"];
const DECREASE_TYPES = ["stock_out", "site_issue", "damaged", "lost", "transfer"];

export class MovementError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

export interface MovementInput {
  type: string;
  product: string;
  warehouse: string;
  quantity: number;
  project?: string;
  site?: string;
  notes?: string;
  referenceType?: string;
  referenceId?: string;
  userId: string;
}

export const siteBalance = projectMaterialBalance;

export async function recordMovement(m: MovementInput) {
  if (!(m.quantity > 0) && m.type !== "adjustment") throw new MovementError("Quantity must be positive", "VALIDATION_ERROR");
  if (PROJECT_TYPES.includes(m.type)) {
    if (!m.project || !mongoose.isValidObjectId(m.project))
      throw new MovementError("A project is required for site movements", "VALIDATION_ERROR");
    if (m.type !== "site_issue") {
      const ok = await takeFromSite({ type: m.type as "consumed" | "site_return", project: m.project, product: m.product, quantity: m.quantity });
      if (!ok) {
        const balance = await siteBalance(m.project, m.product);
        throw new MovementError(`Only ${balance} is at site for this project`, "INSUFFICIENT_SITE_STOCK");
      }
    }
  }

  let previousQuantity: number;
  let newQuantity: number;

  if (m.type === "consumed") {
    // Consumption happens at site: the warehouse already gave this stock up at site_issue.
    const inv = await Inventory.findOne({ product: m.product, warehouse: m.warehouse });
    previousQuantity = newQuantity = inv?.quantity ?? 0;
  } else if (INCREASE_TYPES.includes(m.type)) {
    const inv = await Inventory.findOneAndUpdate(
      { product: m.product, warehouse: m.warehouse },
      { $inc: { quantity: m.quantity }, $setOnInsert: { reservedQuantity: 0 } },
      { new: true, upsert: true }
    );
    newQuantity = inv.quantity;
    previousQuantity = newQuantity - m.quantity;
  } else if (DECREASE_TYPES.includes(m.type)) {
    const inv = await Inventory.findOneAndUpdate(
      { product: m.product, warehouse: m.warehouse, quantity: { $gte: m.quantity } },
      { $inc: { quantity: -m.quantity } },
      { new: true }
    );
    if (!inv) {
      const cur = await Inventory.findOne({ product: m.product, warehouse: m.warehouse });
      throw new MovementError(`Insufficient stock. Available: ${cur?.quantity ?? 0}, requested: ${m.quantity}`, "INSUFFICIENT_STOCK");
    }
    newQuantity = inv.quantity;
    previousQuantity = newQuantity + m.quantity;
  } else if (m.type === "adjustment") {
    if (!(m.quantity >= 0)) throw new MovementError("Counted quantity cannot be negative", "VALIDATION_ERROR");
    const before = await Inventory.findOneAndUpdate(
      { product: m.product, warehouse: m.warehouse },
      { $set: { quantity: m.quantity }, $setOnInsert: { reservedQuantity: 0 } },
      { upsert: true }
    );
    previousQuantity = before?.quantity ?? 0;
    newQuantity = m.quantity;
  } else {
    throw new MovementError("Unknown movement type", "VALIDATION_ERROR");
  }

  const txn = await StockTransaction.create({
    product: m.product,
    warehouse: m.warehouse,
    type: m.type,
    quantity: m.quantity,
    previousQuantity,
    newQuantity,
    project: m.project,
    site: m.site,
    notes: m.notes,
    referenceType: m.referenceType,
    referenceId: m.referenceId,
    createdBy: m.userId,
  });

  if (m.type === "site_issue") await applyToProjectMaterial({ type: m.type, project: m.project, product: m.product, quantity: m.quantity });

  await createAuditLog({
    userId: m.userId,
    action: `stock_${m.type}`,
    module: "inventory",
    recordId: txn._id.toString(),
    previousValue: { quantity: previousQuantity },
    newValue: { quantity: newQuantity, project: m.project },
  });

  return txn;
}
