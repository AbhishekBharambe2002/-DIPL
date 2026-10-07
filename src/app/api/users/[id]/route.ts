import { NextRequest } from "next/server";
import { connectDB } from "@/server/db/connection";
import { User } from "@/server/models/user";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";
import { createAuditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const authUser = await getAuthenticatedUser();
  if (!authUser) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!authUser.permissions.includes("user.view"))
    return errorResponse("Forbidden", "FORBIDDEN", 403);

  const { id } = await params;
  const user = await User.findOne({ _id: id, isDeleted: { $ne: true } })
    .populate("role", "name code permissions")
    .lean();
  if (!user) return errorResponse("Not found", "NOT_FOUND", 404);
  return successResponse(user);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const authUser = await getAuthenticatedUser();
  if (!authUser) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!authUser.permissions.includes("user.edit"))
    return errorResponse("Forbidden", "FORBIDDEN", 403);

  const { id } = await params;
  const body = await req.json();

  if (body.password) {
    body.password = await bcrypt.hash(body.password, 12);
  }

  const previous = await User.findById(id).lean();
  if (!previous) return errorResponse("Not found", "NOT_FOUND", 404);

  const updated = await User.findByIdAndUpdate(id, { $set: body }, { new: true })
    .populate("role", "name code")
    .lean();

  await createAuditLog({
    userId: authUser.id,
    action: "update",
    module: "users",
    recordId: id,
    previousValue: { name: (previous as Record<string, unknown>).name, email: (previous as Record<string, unknown>).email },
    newValue: body,
  });

  return successResponse(updated);
}
