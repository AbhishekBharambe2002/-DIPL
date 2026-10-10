import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connection";
import { Project } from "@/server/models/project";
import { Material } from "@/server/models/material";
import { InventoryLog } from "@/server/models/inventory-log";
import { ProjectSiteLog } from "@/server/models/project-site-log";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";
import { createAuditLog } from "@/lib/audit";

/**
 * Quick-dispatch: send a material straight from inventory to this project's
 * site. Creates a ProjectSiteLog "dispatch" entry and takes the quantity off
 * the material's quantityToDispatch (what's still available to send out) —
 * quantity (the lifetime total received) is untouched.
 *
 * The entry starts "in_transit" — it only counts toward the project's
 * Allocated total once someone confirms delivery (see /api/dispatches/[id]/deliver).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("inventory.issue")) return errorResponse("Forbidden", "FORBIDDEN", 403);
  if (!mongoose.isValidObjectId(id)) return errorResponse("Not found", "NOT_FOUND", 404);

  const project = await Project.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!project) return errorResponse("Project not found", "NOT_FOUND", 404);

  const body = await req.json();
  if (!mongoose.isValidObjectId(body.material)) return errorResponse("Choose a material", "VALIDATION_ERROR", 400);
  const quantity = Number(body.quantity);
  if (!(quantity > 0)) return errorResponse("Quantity must be above zero", "VALIDATION_ERROR", 400);

  const material = await Material.findById(body.material).lean();
  if (!material) return errorResponse("Material not found", "NOT_FOUND", 404);

  const log = await InventoryLog.findOne({ material: material._id });
  const available = log?.quantityToDispatch ?? 0;
  if (quantity > available) {
    return errorResponse(`Only ${available} ${material.unit} available in inventory to dispatch`, "INSUFFICIENT_STOCK", 400);
  }
  const rate = log?.purchasePrice ?? 0;

  try {
    const entry = await ProjectSiteLog.create({
      project: project._id,
      material: material._id,
      productId: material.productId,
      type: "dispatch",
      quantity,
      rate,
      value: quantity * rate,
      date: new Date(),
      deliveryStatus: "in_transit",
      note: body.note,
      createdBy: user.id,
    });

    if (log) {
      await InventoryLog.updateOne({ _id: log._id }, { $inc: { quantityToDispatch: -quantity } });
    }

    await createAuditLog({
      userId: user.id,
      action: "create",
      module: "project_site_logs",
      recordId: entry._id.toString(),
      newValue: { project: project._id.toString(), material: material.productId, quantity },
    });

    return successResponse(entry, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not dispatch the material.";
    return errorResponse(message, "DISPATCH_ERROR", 500);
  }
}
