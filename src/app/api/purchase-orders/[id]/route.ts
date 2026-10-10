import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connection";
import { PurchaseOrder } from "@/server/models/purchase-order";
import { VendorInvoice } from "@/server/models/vendor-invoice";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";
import { createAuditLog } from "@/lib/audit";
import { poTotals } from "@/server/services/procurement";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("purchase_order.view")) return errorResponse("Forbidden", "FORBIDDEN", 403);
  if (!mongoose.isValidObjectId(id)) return errorResponse("Not found", "NOT_FOUND", 404);

  const [po, invoices] = await Promise.all([
    PurchaseOrder.findById(id)
      .populate("vendor", "vendorName contactPerson phone")
      .populate("project", "projectId name")
      .populate("lines.product", "sku name unit purchasePrice")
      .lean(),
    VendorInvoice.find({ purchaseOrder: id }).select("invoiceNo date total status").sort({ date: -1 }).lean(),
  ]);
  if (!po) return errorResponse("Not found", "NOT_FOUND", 404);
  return successResponse({
    ...po,
    ...poTotals((po as { lines: { quantity: number; rate: number; receivedQty: number }[] }).lines),
    invoices,
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("purchase_order.approve")) return errorResponse("Forbidden", "FORBIDDEN", 403);
  if (!mongoose.isValidObjectId(id)) return errorResponse("Not found", "NOT_FOUND", 404);

  const body = await req.json();
  if (body.action !== "cancel") return errorResponse("Unsupported action", "VALIDATION_ERROR", 400);

  const po = await PurchaseOrder.findOneAndUpdate(
    { _id: id, status: { $in: ["open", "partial"] } },
    { $set: { status: "cancelled" } },
    { new: true }
  );
  if (!po) return errorResponse("Only open or partly received orders can be cancelled", "INVALID_STATE", 409);

  await createAuditLog({
    userId: user.id,
    action: "status_change",
    module: "purchase_orders",
    recordId: id,
    newValue: { status: "cancelled" },
  });
  return successResponse(po);
}
