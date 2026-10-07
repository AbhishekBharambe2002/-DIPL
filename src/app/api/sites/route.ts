import { NextRequest } from "next/server";
import { Site } from "@/server/models/site";
import { handleList, handleCreate } from "@/lib/api-handler";

export async function GET(req: NextRequest) {
  return handleList(req, {
    model: Site as never,
    permission: "site.view",
    searchFields: ["name", "siteId", "city", "address"],
    populate: ["project", "customer", "siteEngineer"],
    filterFn: (p) => {
      const f: Record<string, unknown> = {};
      if (p.get("status")) f.status = p.get("status");
      if (p.get("project")) f.project = p.get("project");
      return f;
    },
  });
}

export async function POST(req: NextRequest) {
  return handleCreate(req, {
    model: Site as never,
    permission: "site.create",
    module: "sites",
  });
}
