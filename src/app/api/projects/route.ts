import { NextRequest } from "next/server";
import { Project } from "@/server/models/project";
import { handleList } from "@/lib/api-handler";
import { connectDB } from "@/server/db/connection";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";
import { createAuditLog } from "@/lib/audit";
import { generateProjectId } from "@/server/services/project-id";

export async function GET(req: NextRequest) {
  return handleList(req, {
    model: Project as never,
    permission: "project.view",
    searchFields: ["name", "projectId", "location"],
    populate: ["customer", "projectManager"],
    filterFn: (p) => {
      const f: Record<string, unknown> = {};
      if (p.get("status")) f.status = p.get("status");
      if (p.get("customer")) f.customer = p.get("customer");
      if (p.get("priority")) f.priority = p.get("priority");
      return f;
    },
  });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("project.create")) return errorResponse("Forbidden", "FORBIDDEN", 403);

  try {
    const body = await req.json();
    // Project ID is always server-generated — DIPL-{month letter}{day}-{Nth today} — never taken from the client.
    const projectId = await generateProjectId();

    const doc = await Project.create({ ...body, projectId, createdBy: user.id });

    await createAuditLog({
      userId: user.id,
      action: "create",
      module: "projects",
      recordId: doc._id.toString(),
      newValue: { ...body, projectId },
    });

    return successResponse(doc, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Create failed";
    if (msg.includes("duplicate key") || msg.includes("E11000")) {
      return errorResponse("Duplicate entry", "DUPLICATE", 409);
    }
    return errorResponse(msg, "CREATE_ERROR", 400);
  }
}
