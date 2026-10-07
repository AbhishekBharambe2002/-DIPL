import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connection";
import { Project } from "@/server/models/project";
import { ProjectCost, COST_TYPES } from "@/server/models/project-cost";
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
  const amount = Number(body.amount);
  const description = String(body.description ?? "").trim();
  if (!COST_TYPES.includes(body.type)) return errorResponse("Invalid cost type", "VALIDATION_ERROR", 400);
  if (!description) return errorResponse("Description is required", "VALIDATION_ERROR", 400);
  if (!Number.isFinite(amount) || amount <= 0) return errorResponse("Amount must be positive", "VALIDATION_ERROR", 400);

  const cost = await ProjectCost.create({
    project: id,
    type: body.type,
    description,
    amount,
    date: body.date ? new Date(body.date) : new Date(),
    createdBy: user.id,
  });

  await createAuditLog({
    userId: user.id,
    action: "create",
    module: "project_costs",
    recordId: cost._id.toString(),
    newValue: { project: id, type: body.type, amount, description },
  });

  return successResponse(cost, 201);
}
