import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connection";
import { PrimaryOrder, PRIMARY_ORDER_DESTINATIONS } from "@/server/models/primary-order";
import { Material } from "@/server/models/material";
import {
  getAuthenticatedUser,
  errorResponse,
  successResponse,
  paginatedResponse,
  parsePaginationParams,
} from "@/lib/api-utils";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("purchase_order.view")) return errorResponse("Forbidden", "FORBIDDEN", 403);

  const params = req.nextUrl.searchParams;
  const { page, limit, skip } = parsePaginationParams(params);

  const filter: Record<string, unknown> = {};
  if (params.get("destination")) filter.destination = params.get("destination");
  if (params.get("status")) filter.status = params.get("status");
  if (params.get("project") && mongoose.isValidObjectId(params.get("project"))) filter.project = params.get("project");

  const sortBy: Record<string, 1 | -1> =
    params.get("sort") === "expectedDate" ? { expectedDate: 1 } : { createdAt: -1 };

  const [rows, total] = await Promise.all([
    PrimaryOrder.find(filter)
      .populate("vendor", "vendorName contactPerson phone")
      .populate("project", "projectId name")
      .sort(sortBy)
      .skip(skip)
      .limit(limit)
      .lean(),
    PrimaryOrder.countDocuments(filter),
  ]);

  return paginatedResponse(rows, total, page, limit);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("purchase_order.create")) return errorResponse("Forbidden", "FORBIDDEN", 403);

  const body = await req.json();

  if (!mongoose.isValidObjectId(body.vendor)) return errorResponse("Choose a vendor", "VALIDATION_ERROR", 400);
  if (!body.expectedDate) return errorResponse("Expected delivery date is required", "VALIDATION_ERROR", 400);

  const destination = body.destination;
  if (!(PRIMARY_ORDER_DESTINATIONS as readonly string[]).includes(destination))
    return errorResponse("Choose a destination", "VALIDATION_ERROR", 400);
  if (destination === "project" && !mongoose.isValidObjectId(body.project))
    return errorResponse("Choose a project for direct-to-site delivery", "VALIDATION_ERROR", 400);

  const rawLines = Array.isArray(body.lines) ? body.lines : [];
  if (rawLines.length === 0) return errorResponse("Add at least one material", "VALIDATION_ERROR", 400);

  const materialIds = rawLines.map((l: { material?: string }) => l.material).filter(Boolean);
  if (materialIds.some((id: string) => !mongoose.isValidObjectId(id)))
    return errorResponse("One of the materials is invalid", "VALIDATION_ERROR", 400);

  const materials = await Material.find({ _id: { $in: materialIds } }).lean();
  const matMap = new Map(materials.map((m) => [String(m._id), m]));

  const lines = rawLines.map((l: { material: string; quantity: unknown; rate: unknown }) => {
    const mat = matMap.get(l.material);
    const quantity = Number(l.quantity);
    const rate = Number(l.rate);
    return {
      material: l.material,
      productId: mat?.productId ?? "",
      name: mat?.name ?? "",
      unit: mat?.unit ?? "Nos",
      quantity,
      rate,
      amount: quantity * rate,
    };
  });

  if (lines.some((l: { quantity: number; rate: number; productId: string }) => !l.productId || !(l.quantity > 0) || !(l.rate >= 0)))
    return errorResponse("Every line needs a material, a quantity above zero and a rate", "VALIDATION_ERROR", 400);

  const totalAmount = lines.reduce((s: number, l: { amount: number }) => s + l.amount, 0);

  // Generate a sequential order number: PO-0001, PO-0002, ...
  const count = await PrimaryOrder.countDocuments({});
  const orderNo = `PO-${String(count + 1).padStart(4, "0")}`;

  try {
    const order = await PrimaryOrder.create({
      orderNo,
      vendor: body.vendor,
      lines,
      totalAmount,
      expectedDate: new Date(body.expectedDate),
      destination,
      project: destination === "project" ? body.project : undefined,
      notes: body.notes,
      status: "placed",
      createdBy: user.id,
    });
    await createAuditLog({
      userId: user.id,
      action: "create",
      module: "primary_orders",
      recordId: order._id.toString(),
      newValue: { orderNo, lines: lines.length, totalAmount },
    });
    return successResponse(order, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("E11000")) return errorResponse("That order number already exists", "DUPLICATE", 409);
    return errorResponse("Could not create the order", "CREATE_ERROR", 400);
  }
}
