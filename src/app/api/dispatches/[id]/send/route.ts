import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connection";
import { InventoryLog } from "@/server/models/inventory-log";
import { ProjectSiteLog } from "@/server/models/project-site-log";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";
import { createAuditLog } from "@/lib/audit";

/**
 * Turns a "requested" material requirement into a real dispatch: takes the
 * quantity off the material's quantityToDispatch and moves it to
 * "in_transit" — the point at which it actually leaves the warehouse.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("inventory.issue")) return errorResponse("Forbidden", "FORBIDDEN", 403);
  if (!mongoose.isValidObjectId(id)) return errorResponse("Not found", "NOT_FOUND", 404);

  const entry = await ProjectSiteLog.findOne({ _id: id, type: "dispatch" });
  if (!entry) return errorResponse("Dispatch not found", "NOT_FOUND", 404);
  if (entry.deliveryStatus !== "requested")
    return errorResponse("This has already been dispatched", "ALREADY_DISPATCHED", 409);

  const log = await InventoryLog.findOne({ material: entry.material });
  const available = log?.quantityToDispatch ?? 0;
  if (entry.quantity > available) {
    return errorResponse(`Only ${available} available in inventory to dispatch`, "INSUFFICIENT_STOCK", 400);
  }

  entry.deliveryStatus = "in_transit";
  await entry.save();

  if (log) {
    await InventoryLog.updateOne({ _id: log._id }, { $inc: { quantityToDispatch: -entry.quantity } });
  }

  await createAuditLog({
    userId: user.id,
    action: "update",
    module: "project_site_logs",
    recordId: entry._id.toString(),
    newValue: { deliveryStatus: "in_transit" },
  });

  const populated = await ProjectSiteLog.findById(id)
    .populate("project", "projectId name")
    .populate("material", "name category make size unit")
    .lean();

  return successResponse(populated);
}
