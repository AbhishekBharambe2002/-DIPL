import { NextRequest } from "next/server";
import { handleList, handleCreate } from "@/lib/api-handler";
import { Task } from "@/server/models/task";

export async function GET(req: NextRequest) {
  return handleList(req, {
    model: Task as never,
    permission: "task.view",
    searchFields: ["title"],
    populate: ["assignedTo", "project", "site"],
    filterFn: (p) => {
      const f: Record<string, unknown> = {};
      if (p.get("status")) f.status = p.get("status");
      if (p.get("project")) f.project = p.get("project");
      if (p.get("site")) f.site = p.get("site");
      if (p.get("assignedTo")) f.assignedTo = p.get("assignedTo");
      return f;
    },
  });
}

export async function POST(req: NextRequest) {
  return handleCreate(req, {
    model: Task as never,
    permission: "task.create",
    module: "tasks",
  });
}
