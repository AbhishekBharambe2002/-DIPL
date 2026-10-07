 import { NextRequest } from "next/server";
import { connectDB } from "@/server/db/connection";
import { Inventory } from "@/server/models/inventory";
import { StockTransaction } from "@/server/models/stock-transaction";
import {
  getAuthenticatedUser,
  errorResponse,
  successResponse,
  paginatedResponse,
  parsePaginationParams,
} from "@/lib/api-utils";
import { createAuditLog } from "@/lib/audit";
import mongoose from "mongoose";
import type { Permission } from "@/config/permissions";

const INCREASE_TYPES = ["purchase", "stock_in", "site_return"];
const DECREASE_TYPES = ["stock_out", "site_issue", "damaged", "lost"];
const PROJECT_TYPES = ["site_issue", "consumed", "site_return"];

const TYPE_PERMISSION: Record<string, Permission> = {
  purchase: "inventory.receive",
  stock_in: "inventory.receive",
  site_return: "inventory.receive",
  stock_out: "inventory.issue",
  site_issue: "inventory.issue",
  consumed: "inventory.issue",
  transfer: "inventory.transfer",
  adjustment: "inventory.adjust",
  damaged: "inventory.adjust",
  lost: "inventory.adjust",
};

async function siteBalance(project: string, product: string) {
  const rows = await StockTransaction.aggregate([
    {
      $match: {
        project: new mongoose.Types.ObjectId(project),
        product: new mongoose.Types.ObjectId(product),
        type: { $in: PROJECT_TYPES },
      },
    },
    { $group: { _id: "$type", qty: { $sum: "$quantity" } } },
  ]);
  const q = (t: string) => rows.find((r) => r._id === t)?.qty ?? 0;
  return q("site_issue") - q("consumed") - q("site_return");
}

export async function GET(req: NextRequest) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("inventory.view"))
    return errorResponse("Forbidden", "FORBIDDEN", 403);

  const params = req.nextUrl.searchParams;
  const { page, limit, skip } = parsePaginationParams(params);

  const filter: Record<string, unknown> = {};
  if (params.get("product")) filter.product = params.get("product");
  if (params.get("warehouse")) filter.warehouse = params.get("warehouse");
  if (params.get("type")) filter.type = params.get("type");
  if (params.get("project")) filter.project = params.get("project");

  const [data, total] = await Promise.all([
    StockTransaction.find(filter)
      .populate("product")
      .populate("warehouse")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    StockTransaction.countDocuments(filter),
  ]);

  return paginatedResponse(data, total, page, limit);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);

  try {
    const body = await req.json();
    const { product, warehouse, type, project, site, notes } = body;
    const quantity = Number(body.quantity);

    if (!product || !warehouse || !type || !quantity) {
      return errorResponse("Missing required fields", "VALIDATION_ERROR", 400);
    }
    const permission = TYPE_PERMISSION[type];
    if (!permission) return errorResponse("Unknown movement type", "VALIDATION_ERROR", 400);
    if (!user.permissions.includes(permission)) return errorResponse("Forbidden", "FORBIDDEN", 403);
    if (!(quantity > 0)) return errorResponse("Quantity must be positive", "VALIDATION_ERROR", 400);

    if (PROJECT_TYPES.includes(type)) {
      if (!project || !mongoose.isValidObjectId(project))
        return errorResponse("A project is required for site movements", "VALIDATION_ERROR", 400);
      if (type !== "site_issue") {
        const balance = await siteBalance(project, product);
        if (quantity > balance)
          return errorResponse(
            `Only ${balance} is at site for this project`,
            "INSUFFICIENT_SITE_STOCK",
            400
          );
      }
    }

    // Consumption happens at site: the warehouse already gave this stock up at site_issue.
    if (type === "consumed") {
      const inv = await Inventory.findOne({ product, warehouse });
      const onHand = inv?.quantity ?? 0;
      const txn = await StockTransaction.create({
        product,
        warehouse,
        type,
        quantity,
        previousQuantity: onHand,
        newQuantity: onHand,
        project,
        site,
        notes,
        createdBy: user.id,
      });
      await createAuditLog({
        userId: user.id,
        action: "stock_consumed",
        module: "inventory",
        recordId: txn._id.toString(),
        newValue: { project, product, quantity },
      });
      return successResponse(txn, 201);
    }

    let inv = await Inventory.findOne({ product, warehouse });
    if (!inv) {
      inv = await Inventory.create({ product, warehouse, quantity: 0, reservedQuantity: 0 });
    }

    const previousQuantity = inv.quantity;
    let newQuantity = previousQuantity;

    if (INCREASE_TYPES.includes(type)) {
      newQuantity = previousQuantity + quantity;
    } else if (DECREASE_TYPES.includes(type)) {
      newQuantity = previousQuantity - quantity;
      if (newQuantity < 0) {
        return errorResponse(
          `Insufficient stock. Available: ${previousQuantity}, Requested: ${quantity}`,
          "INSUFFICIENT_STOCK",
          400
        );
      }
    } else if (type === "adjustment") {
      newQuantity = quantity;
    } else if (type === "transfer") {
      newQuantity = previousQuantity - quantity;
      if (newQuantity < 0) {
        return errorResponse("Insufficient stock for transfer", "INSUFFICIENT_STOCK", 400);
      }
    }

    inv.quantity = newQuantity;
    await inv.save();

    const txn = await StockTransaction.create({
      product,
      warehouse,
      type,
      quantity,
      previousQuantity,
      newQuantity,
      project,
      site,
      notes,
      createdBy: user.id,
    });

    await createAuditLog({
      userId: user.id,
      action: `stock_${type}`,
      module: "inventory",
      recordId: txn._id.toString(),
      previousValue: { quantity: previousQuantity },
      newValue: { quantity: newQuantity },
    });

    return successResponse(txn, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Transaction failed";
    return errorResponse(msg, "TRANSACTION_ERROR", 400);
  }
}
