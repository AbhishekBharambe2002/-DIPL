import { NextRequest } from "next/server";
import { Task } from "@/server/models/task";
import { handleGet, handleUpdate } from "@/lib/api-handler";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleGet(id, {
    model: Task as never,
    permission: "task.view",
    populate: ["assignedTo", "project", "site"],
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleUpdate(id, req, {
    model: Task as never,
    permission: "task.edit",
    module: "tasks",
  });
}
