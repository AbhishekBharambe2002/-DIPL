import { NextRequest } from "next/server";
import { connectDB } from "@/server/db/connection";
import { Notification } from "@/server/models/notification";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);

  const { id } = await params;
  const notification = await Notification.findOneAndUpdate(
    { _id: id, user: user.id },
    { isRead: true },
    { new: true }
  ).lean();

  if (!notification) return errorResponse("Not found", "NOT_FOUND", 404);
  return successResponse(notification);
}
