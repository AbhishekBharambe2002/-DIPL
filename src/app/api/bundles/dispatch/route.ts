import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connection";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";
import { dispatchBundle } from "@/server/services/bundles";
import { MovementError } from "@/server/services/movements";

export async function POST(req: NextRequest) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("inventory.issue")) return errorResponse("Forbidden", "FORBIDDEN", 403);

  const body = await req.json();
  for (const k of ["bundleType", "warehouse", "project"])
    if (!mongoose.isValidObjectId(body[k])) return errorResponse(`Choose a ${k === "bundleType" ? "bundle" : k}`, "VALIDATION_ERROR", 400);

  try {
    const inst = await dispatchBundle({
      bundleType: body.bundleType,
      units: Number(body.units),
      warehouse: body.warehouse,
      project: body.project,
      userId: user.id,
    });
    return successResponse(inst, 201);
  } catch (err) {
    if (err instanceof MovementError) return errorResponse(err.message, err.code, 400);
    throw err;
  }
}
