import { NextRequest } from "next/server";
import { connectDB } from "@/server/db/connection";
import { Notification } from "@/server/models/notification";
import { getAuthenticatedUser, errorResponse, paginatedResponse, parsePaginationParams } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);

  const params = req.nextUrl.searchParams;
  const { page, limit, skip } = parsePaginationParams(params);

  const filter: Record<string, unknown> = { user: user.id };
  if (params.get("unread") === "true") filter.isRead = false;

  const [data, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
  ]);

  return paginatedResponse(data, total, page, limit);
}
