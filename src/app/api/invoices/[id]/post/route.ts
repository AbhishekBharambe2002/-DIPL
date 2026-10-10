import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connection";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";
import { postInvoice, PostingError } from "@/server/services/procurement";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("goods_receipt.create") || !user.permissions.includes("inventory.receive"))
    return errorResponse("Forbidden", "FORBIDDEN", 403);
  if (!mongoose.isValidObjectId(id)) return errorResponse("Not found", "NOT_FOUND", 404);

  try {
    return successResponse(await postInvoice(id, user.id));
  } catch (err) {
    if (err instanceof PostingError) return errorResponse(err.message, "INVALID_STATE", 409);
    throw err;
  }
}
