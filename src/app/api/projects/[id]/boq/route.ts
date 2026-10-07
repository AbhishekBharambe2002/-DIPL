import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connection";
import { Project } from "@/server/models/project";
import { BoqItem } from "@/server/models/boq-item";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("project.edit")) return errorResponse("Forbidden", "FORBIDDEN", 403);
  if (!mongoose.isValidObjectId(id) || !(await Project.exists({ _id: id, isDeleted: { $ne: true } })))
    return errorResponse("Project not found", "NOT_FOUND", 404);

  const body = await req.json();
  const quantity = Number(body.quantity);
  const supplyRate = Number(body.supplyRate);
  const installRate = Number(body.installRate || 0);
  const itemNo = String(body.itemNo ?? "").trim();
  const description = String(body.description ?? "").trim();
  const unit = String(body.unit ?? "").trim();

  if (!itemNo || !description || !unit)
    return errorResponse("Item no, description and unit are required", "VALIDATION_ERROR", 400);
  if (![quantity, supplyRate, installRate].every((n) => Number.isFinite(n) && n >= 0) || quantity === 0)
    return errorResponse("Quantity and rates must be valid numbers", "VALIDATION_ERROR", 400);

  const item = await BoqItem.create({
    project: id,
    itemNo,
    section: String(body.section ?? "").trim() || undefined,
    description,
    unit,
    quantity,
    supplyRate,
    installRate,
    createdBy: user.id,
  });

  await createAuditLog({
    userId: user.id,
    action: "create",
    module: "boq",
    recordId: item._id.toString(),
    newValue: { project: id, itemNo, quantity, supplyRate, installRate },
  });

  return successResponse(item, 201);
}
