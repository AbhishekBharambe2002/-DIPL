import { NextRequest } from "next/server";
import { Project } from "@/server/models/project";
import { handleGet, handleUpdate } from "@/lib/api-handler";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleGet(id, {
    model: Project as never,
    permission: "project.view",
    populate: ["customer", "projectManager", "projectEngineer", "assignedTeam"],
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleUpdate(id, req, {
    model: Project as never,
    permission: "project.edit",
    module: "projects",
  });
}
