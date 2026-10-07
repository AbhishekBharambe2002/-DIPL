import { NextRequest } from "next/server";
import { SiteVisit } from "@/server/models/site-visit";
import { handleList, handleCreate } from "@/lib/api-handler";

export async function GET(req: NextRequest) {
  return handleList(req, {
    model: SiteVisit as never,
    permission: "site.visit",
    searchFields: ["purpose", "notes"],
    populate: ["site", "employee"],
    filterFn: (p) => {
      const f: Record<string, unknown> = {};
      if (p.get("site")) f.site = p.get("site");
      if (p.get("employee")) f.employee = p.get("employee");
      return f;
    },
  });
}

export async function POST(req: NextRequest) {
  return handleCreate(req, {
    model: SiteVisit as never,
    permission: "site.visit",
    module: "site_visits",
  });
}
