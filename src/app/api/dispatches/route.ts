import { NextRequest } from "next/server";
import { connectDB } from "@/server/db/connection";
import { ProjectSiteLog } from "@/server/models/project-site-log";
import { getAuthenticatedUser, errorResponse, paginatedResponse, parsePaginationParams } from "@/lib/api-utils";

/**
 * Every dispatch (material sent out of inventory to a project site),
 * newest first — the data behind the "Dispatched" log page.
 */
export async function GET(req: NextRequest) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("inventory.view")) return errorResponse("Forbidden", "FORBIDDEN", 403);

  const params = req.nextUrl.searchParams;
  const { page, limit, skip, search } = parsePaginationParams(params);

  const filter: Record<string, unknown> = { type: "dispatch" };
  if (params.get("project")) filter.project = params.get("project");

  if (search) {
    const re = { $regex: search, $options: "i" };
    filter.$or = [{ productId: re }];
  }

  const [rows, total] = await Promise.all([
    ProjectSiteLog.find(filter)
      .populate("project", "projectId name")
      .populate("material", "name category make size unit")
      .populate("createdBy", "name")
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ProjectSiteLog.countDocuments(filter),
  ]);

  return paginatedResponse(rows, total, page, limit);
}
