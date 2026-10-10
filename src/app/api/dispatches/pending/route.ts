import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connection";
import { ProjectSiteLog } from "@/server/models/project-site-log";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";

/**
 * Dispatches that have left inventory but haven't been confirmed as arrived
 * at site yet — what the "pending deliveries" bell on the SKU master shows,
 * and (filtered to one project via ?project=) what the "Material arrived"
 * button on a project's own page shows.
 */
export async function GET(req: NextRequest) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("product.view")) return errorResponse("Forbidden", "FORBIDDEN", 403);

  const project = req.nextUrl.searchParams.get("project");
  const filter: Record<string, unknown> = { type: "dispatch", deliveryStatus: "in_transit" };
  if (project && mongoose.isValidObjectId(project)) filter.project = project;

  const rows = await ProjectSiteLog.find(filter)
    .populate("project", "projectId name")
    .populate("material", "name category make size unit")
    .sort({ date: -1 })
    .lean();

  return successResponse({ count: rows.length, items: rows });
}
