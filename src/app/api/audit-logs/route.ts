import { NextRequest } from "next/server";
import { connectDB } from "@/server/db/connection";
import { AuditLog } from "@/server/models/audit-log";
import { getAuthenticatedUser, errorResponse, paginatedResponse, parsePaginationParams } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("audit.view"))
    return errorResponse("Forbidden", "FORBIDDEN", 403);

  const params = req.nextUrl.searchParams;
  const { page, limit, skip } = parsePaginationParams(params);

  const filter: Record<string, unknown> = {};
  if (params.get("module")) filter.module = params.get("module");
  if (params.get("action")) filter.action = params.get("action");
  if (params.get("user")) filter.user = params.get("user");

  const [data, total] = await Promise.all([
    AuditLog.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return paginatedResponse(data, total, page, limit);
}
