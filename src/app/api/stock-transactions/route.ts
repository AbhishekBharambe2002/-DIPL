import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connection";
import { StockTransaction } from "@/server/models/stock-transaction";
import {
  getAuthenticatedUser,
  errorResponse,
  successResponse,
  paginatedResponse,
  parsePaginationParams,
} from "@/lib/api-utils";
import type { Permission } from "@/config/permissions";
import { recordMovement, MovementError } from "@/server/services/movements";

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

export async function GET(req: NextRequest) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("inventory.view")) return errorResponse("Forbidden", "FORBIDDEN", 403);

  const params = req.nextUrl.searchParams;
  const { page, limit, skip } = parsePaginationParams(params);

  const filter: Record<string, unknown> = {};
  for (const k of ["product", "warehouse", "project"]) {
    const v = params.get(k);
    if (v && mongoose.isValidObjectId(v)) filter[k] = v;
  }
  if (params.get("type") && TYPE_PERMISSION[params.get("type")!]) filter.type = params.get("type");

  const [data, total] = await Promise.all([
    StockTransaction.find(filter)
      .populate("product")
      .populate("warehouse")
      .populate("project", "projectId name")
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

  const body = await req.json();
  const { product, warehouse, type, project, site, notes } = body;
  const quantity = Number(body.quantity);

  if (!mongoose.isValidObjectId(product) || !mongoose.isValidObjectId(warehouse) || !type || !Number.isFinite(quantity))
    return errorResponse("Missing required fields", "VALIDATION_ERROR", 400);
  const permission = TYPE_PERMISSION[type];
  if (!permission) return errorResponse("Unknown movement type", "VALIDATION_ERROR", 400);
  if (!user.permissions.includes(permission)) return errorResponse("Forbidden", "FORBIDDEN", 403);

  try {
    const txn = await recordMovement({ type, product, warehouse, quantity, project, site, notes, userId: user.id });
    return successResponse(txn, 201);
  } catch (err) {
    if (err instanceof MovementError) return errorResponse(err.message, err.code, 400);
    throw err;
  }
}
