import { NextRequest } from "next/server";
import { Site } from "@/server/models/site";
import { handleGet, handleUpdate } from "@/lib/api-handler";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleGet(id, {
    model: Site as never,
    permission: "site.view",
    populate: ["project", "customer", "siteEngineer", "supervisor"],
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleUpdate(id, req, {
    model: Site as never,
    permission: "site.edit",
    module: "sites",
  });
}
