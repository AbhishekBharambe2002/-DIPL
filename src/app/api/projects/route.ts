import { NextRequest } from "next/server";
import { Project } from "@/server/models/project";
import { handleList, handleCreate } from "@/lib/api-handler";

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
  return handleCreate(req, {
    model: Project as never,
    permission: "project.create",
    module: "projects",
  });
}
