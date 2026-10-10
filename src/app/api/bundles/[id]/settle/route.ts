import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connection";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";
import { settleBundle } from "@/server/services/bundles";
import { MovementError } from "@/server/services/movements";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!mongoose.isValidObjectId(id)) return errorResponse("Not found", "NOT_FOUND", 404);

  const body = await req.json();
  const lines = (Array.isArray(body.lines) ? body.lines : []).filter(
    (l: { product?: string; consumed?: unknown; returned?: unknown }) => mongoose.isValidObjectId(l.product) && (Number(l.consumed) > 0 || Number(l.returned) > 0)
  );
  if (lines.length === 0) return errorResponse("Enter at least one consumed or returned quantity", "VALIDATION_ERROR", 400);
  if (lines.some((l: { consumed?: unknown }) => Number(l.consumed) > 0) && !user.permissions.includes("inventory.issue"))
    return errorResponse("Forbidden", "FORBIDDEN", 403);
  if (lines.some((l: { returned?: unknown }) => Number(l.returned) > 0) && !user.permissions.includes("inventory.receive"))
    return errorResponse("Forbidden", "FORBIDDEN", 403);

  try {
    return successResponse(await settleBundle(id, lines, user.id));
  } catch (err) {
    if (err instanceof MovementError) return errorResponse(err.message, err.code, 400);
    throw err;
  }
}
