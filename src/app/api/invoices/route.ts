import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connection";
import { VendorInvoice } from "@/server/models/vendor-invoice";
import { PurchaseOrder } from "@/server/models/purchase-order";
import {
  getAuthenticatedUser,
  errorResponse,
  successResponse,
  paginatedResponse,
  parsePaginationParams,
} from "@/lib/api-utils";
import { createAuditLog } from "@/lib/audit";
import { invoiceTotals, postInvoice, PostingError } from "@/server/services/procurement";

export async function GET(req: NextRequest) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("goods_receipt.view")) return errorResponse("Forbidden", "FORBIDDEN", 403);

  const params = req.nextUrl.searchParams;
  const { page, limit, skip } = parsePaginationParams(params);
  const filter: Record<string, unknown> = {};
  if (params.get("status") === "draft" || params.get("status") === "posted") filter.status = params.get("status");

  const [data, total] = await Promise.all([
    VendorInvoice.find(filter)
      .populate("vendor", "vendorName")
      .populate("purchaseOrder", "poNumber")
      .populate("warehouse", "name")
      .populate("lines.product", "sku name unit")
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    VendorInvoice.countDocuments(filter),
  ]);
  return paginatedResponse(data, total, page, limit);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("goods_receipt.create")) return errorResponse("Forbidden", "FORBIDDEN", 403);

  const body = await req.json();
  const invoiceNo = String(body.invoiceNo ?? "").trim();
  if (!invoiceNo) return errorResponse("Invoice number is required", "VALIDATION_ERROR", 400);
  if (!mongoose.isValidObjectId(body.vendor)) return errorResponse("Choose a supplier", "VALIDATION_ERROR", 400);
  if (!mongoose.isValidObjectId(body.warehouse)) return errorResponse("Choose the receiving warehouse", "VALIDATION_ERROR", 400);
  if (body.purchaseOrder) {
    if (!mongoose.isValidObjectId(body.purchaseOrder)) return errorResponse("Invalid purchase order", "VALIDATION_ERROR", 400);
    const po = await PurchaseOrder.findById(body.purchaseOrder).select("vendor status").lean<{ vendor: unknown; status: string }>();
    if (!po || String(po.vendor) !== String(body.vendor))
      return errorResponse("That purchase order belongs to a different supplier", "VALIDATION_ERROR", 400);
    if (po.status === "cancelled") return errorResponse("That purchase order is cancelled", "VALIDATION_ERROR", 400);
  }

  const lines = (Array.isArray(body.lines) ? body.lines : []).map(
    (l: { product?: string; quantity?: unknown; rate?: unknown; gstPercent?: unknown }) => ({
      product: l.product,
      quantity: Number(l.quantity),
      rate: Number(l.rate),
      gstPercent: l.gstPercent === undefined || l.gstPercent === "" ? 18 : Number(l.gstPercent),
    })
  );
  if (
    lines.length === 0 ||
    lines.some(
      (l: { product?: string; quantity: number; rate: number; gstPercent: number }) =>
        !mongoose.isValidObjectId(l.product) || !(l.quantity > 0) || !(l.rate >= 0) || !(l.gstPercent >= 0 && l.gstPercent <= 28)
    )
  )
    return errorResponse("Every line needs a SKU, a quantity above zero, a rate and GST between 0 and 28%", "VALIDATION_ERROR", 400);

  const totals = invoiceTotals(lines);
  let invoice;
  try {
    invoice = await VendorInvoice.create({
      invoiceNo,
      vendor: body.vendor,
      purchaseOrder: body.purchaseOrder || undefined,
      warehouse: body.warehouse,
      date: body.date ? new Date(body.date) : new Date(),
      lines,
      ...totals,
      captureMethod: "manual",
      status: "draft",
      notes: body.notes,
      createdBy: user.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("E11000")) return errorResponse("This supplier's invoice number is already captured", "DUPLICATE", 409);
    return errorResponse("Could not save the invoice", "CREATE_ERROR", 400);
  }

  await createAuditLog({
    userId: user.id,
    action: "create",
    module: "invoices",
    recordId: invoice._id.toString(),
    newValue: { invoiceNo, total: totals.total },
  });

  if (body.post === true) {
    if (!user.permissions.includes("inventory.receive"))
      return successResponse({ ...invoice.toObject(), note: "Saved as draft — you cannot post receipts" }, 201);
    try {
      return successResponse(await postInvoice(invoice._id.toString(), user.id), 201);
    } catch (err) {
      if (err instanceof PostingError) return errorResponse(err.message, "INVALID_STATE", 409);
      throw err;
    }
  }
  return successResponse(invoice, 201);
}
