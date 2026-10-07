import { NextRequest } from "next/server";
import { Vendor } from "@/server/models/vendor";
import { handleGet, handleUpdate } from "@/lib/api-handler";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleGet(id, { model: Vendor as never, permission: "vendor.view" });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleUpdate(id, req, {
    model: Vendor as never,
    permission: "vendor.edit",
    module: "vendors",
  });
}
