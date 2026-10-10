import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connection";
import { PrimaryOrder, type IPrimaryOrderLine } from "@/server/models/primary-order";
import { InventoryLog } from "@/server/models/inventory-log";
import { ProjectSiteLog } from "@/server/models/project-site-log";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";
import { createAuditLog } from "@/lib/audit";

/**
 * Confirm delivery of a primary order: marks it delivered and posts the
 * lines into the right ledger —
 *   destination "inventory" → increases InventoryLog quantity/rate per material
 *   destination "project"   → adds a "dispatch" entry to ProjectSiteLog per material
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("inventory.receive")) return errorResponse("Forbidden", "FORBIDDEN", 403);
  if (!mongoose.isValidObjectId(id)) return errorResponse("Not found", "NOT_FOUND", 404);

  try {
    const order = await PrimaryOrder.findById(id);
    if (!order) return errorResponse("Order not found", "NOT_FOUND", 404);
    if (order.status === "delivered")
      return errorResponse("This order was already marked delivered", "ALREADY_DELIVERED", 409);

    const now = new Date();

    if (order.destination === "inventory") {
      for (const line of order.lines) {
        const existing = await InventoryLog.findOne({ material: line.material });
        if (existing) {
          // Newly arrived stock raises both the lifetime total and what's available to dispatch.
          const newQty = existing.quantity + line.quantity;
          const newToDispatch = existing.quantityToDispatch + line.quantity;
          await InventoryLog.updateOne(
            { _id: existing._id },
            {
              $set: {
                quantity: newQty,
                quantityToDispatch: newToDispatch,
                purchasePrice: line.rate,
                totalValue: newQty * line.rate,
                addedAt: now,
              },
            }
          );
        } else {
          await InventoryLog.create({
            material: line.material,
            productId: line.productId,
            sheet: order.destination,
            quantity: line.quantity,
            quantityToDispatch: line.quantity,
            purchasePrice: line.rate,
            totalValue: line.quantity * line.rate,
            addedAt: now,
          });
        }
      }
    } else if (order.destination === "project" && order.project) {
      // The vendor has shipped it, but it still needs someone at site to confirm it actually
      // arrived — same as a warehouse dispatch. It starts "in_transit" and shows up under
      // "Material arrived" on the project page (and the pending-deliveries bell) until then.
      const logs = order.lines.map((line: IPrimaryOrderLine) => ({
        project: order.project,
        material: line.material,
        productId: line.productId,
        type: "dispatch" as const,
        quantity: line.quantity,
        rate: line.rate,
        value: line.quantity * line.rate,
        date: now,
        deliveryStatus: "in_transit" as const,
        note: `From order ${order.orderNo}`,
        createdBy: user.id,
      }));
      await ProjectSiteLog.insertMany(logs);
    }

    order.status = "delivered";
    order.deliveredAt = now;
    if (mongoose.isValidObjectId(user.id)) {
      order.deliveredBy = new mongoose.Types.ObjectId(user.id);
    }
    await order.save();

    await createAuditLog({
      userId: user.id,
      action: "update",
      module: "primary_orders",
      recordId: order._id.toString(),
      newValue: { status: "delivered", deliveredAt: now },
    });

    const populated = await PrimaryOrder.findById(id)
      .populate("vendor", "vendorName contactPerson phone")
      .populate("project", "projectId name")
      .lean();

    return successResponse(populated);
  } catch (err) {
    console.error("Failed to confirm delivery for primary order", id, err);
    const message = err instanceof Error ? err.message : "Could not confirm delivery.";
    return errorResponse(message, "DELIVER_ERROR", 500);
  }
}
