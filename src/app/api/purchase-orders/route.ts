import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connection";
import { PurchaseOrder, PO_STATUSES } from "@/server/models/purchase-order";
import {
  getAuthenticatedUser,
  errorResponse,
  successResponse,
  paginatedResponse,
  parsePaginationParams,
} from "@/lib/api-utils";
import { createAuditLog } from "@/lib/audit";
import { poTotals } from "@/server/services/procurement";

export async function GET(req: NextRequest) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("purchase_order.view")) return errorResponse("Forbidden", "FORBIDDEN", 403);

  const params = req.nextUrl.searchParams;
  const { page, limit, skip } = parsePaginationParams(params);
  const filter: Record<string, unknown> = {};
  const status = params.get("status");
  if (status && (PO_STATUSES as readonly string[]).includes(status)) filter.status = status;
  if (params.get("vendor") && mongoose.isValidObjectId(params.get("vendor"))) filter.vendor = params.get("vendor");

  const [rows, total] = await Promise.all([
    PurchaseOrder.find(filter)
      .populate("vendor", "vendorName")
      .populate("project", "projectId name")
      .populate("lines.product", "sku name unit")
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PurchaseOrder.countDocuments(filter),
  ]);

  const data = rows.map((r) => ({ ...r, ...poTotals((r as { lines: { quantity: number; rate: number; receivedQty: number }[] }).lines) }));
  return paginatedResponse(data, total, page, limit);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("purchase_order.create")) return errorResponse("Forbidden", "FORBIDDEN", 403);

  const body = await req.json();
  const poNumber = String(body.poNumber ?? "").trim();
  if (!poNumber) return errorResponse("PO number is required", "VALIDATION_ERROR", 400);
  if (!mongoose.isValidObjectId(body.vendor)) return errorResponse("Choose a supplier", "VALIDATION_ERROR", 400);
  if (body.project && !mongoose.isValidObjectId(body.project)) return errorResponse("Invalid project", "VALIDATION_ERROR", 400);

  const lines = Array.isArray(body.lines) ? body.lines : [];
  const clean = lines.map((l: { product?: string; quantity?: unknown; rate?: unknown }) => ({
    product: l.product,
    quantity: Number(l.quantity),
    rate: Number(l.rate),
    receivedQty: 0,
  }));
  if (
    clean.length === 0 ||
    clean.some(
      (l: { product?: string; quantity: number; rate: number }) =>
        !mongoose.isValidObjectId(l.product) || !(l.quantity > 0) || !(l.rate >= 0)
    )
  )
    return errorResponse("Every line needs a SKU, a quantity above zero and a rate", "VALIDATION_ERROR", 400);

  try {
    const po = await PurchaseOrder.create({
      poNumber,
      vendor: body.vendor,
      project: body.project || undefined,
      date: body.date ? new Date(body.date) : new Date(),
      expectedDate: body.expectedDate ? new Date(body.expectedDate) : undefined,
      notes: body.notes,
      lines: clean,
      status: "open",
      createdBy: user.id,
    });
    await createAuditLog({
      userId: user.id,
      action: "create",
      module: "purchase_orders",
      recordId: po._id.toString(),
      newValue: { poNumber, lines: clean.length },
    });
    return successResponse(po, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("E11000")) return errorResponse("That PO number already exists", "DUPLICATE", 409);
    return errorResponse("Could not create the purchase order", "CREATE_ERROR", 400);
  }
}
