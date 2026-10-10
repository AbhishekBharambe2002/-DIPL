import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connection";
import { ProjectSiteLog } from "@/server/models/project-site-log";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";
import { createAuditLog } from "@/lib/audit";

/**
 * Confirms a dispatch has arrived at site. Stock already left inventory at
 * dispatch time — this is the step that makes it count toward the project's
 * Allocated total.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("inventory.receive")) return errorResponse("Forbidden", "FORBIDDEN", 403);
  if (!mongoose.isValidObjectId(id)) return errorResponse("Not found", "NOT_FOUND", 404);

  const entry = await ProjectSiteLog.findOne({ _id: id, type: "dispatch" });
  if (!entry) return errorResponse("Dispatch not found", "NOT_FOUND", 404);
  if (entry.deliveryStatus === "delivered")
    return errorResponse("This dispatch was already marked delivered", "ALREADY_DELIVERED", 409);

  entry.deliveryStatus = "delivered";
  entry.deliveredAt = new Date();
  if (mongoose.isValidObjectId(user.id)) entry.deliveredBy = new mongoose.Types.ObjectId(user.id);
  await entry.save();

  await createAuditLog({
    userId: user.id,
    action: "update",
    module: "project_site_logs",
    recordId: entry._id.toString(),
    newValue: { deliveryStatus: "delivered" },
  });

  const populated = await ProjectSiteLog.findById(id)
    .populate("project", "projectId name")
    .populate("material", "name category make size unit")
    .lean();

  return successResponse(populated);
}
