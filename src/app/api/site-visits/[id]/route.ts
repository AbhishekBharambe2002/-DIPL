import { NextRequest } from "next/server";
import { SiteVisit } from "@/server/models/site-visit";
import { handleGet, handleUpdate } from "@/lib/api-handler";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleGet(id, {
    model: SiteVisit as never,
    permission: "site.visit",
    populate: ["site", "employee"],
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleUpdate(id, req, {
    model: SiteVisit as never,
    permission: "site.visit",
    module: "site_visits",
  });
}
