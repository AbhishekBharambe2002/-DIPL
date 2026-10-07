import { NextRequest } from "next/server";
import { Warehouse } from "@/server/models/warehouse";
import { handleGet, handleUpdate } from "@/lib/api-handler";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleGet(id, { model: Warehouse as never, permission: "warehouse.view" });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleUpdate(id, req, {
    model: Warehouse as never,
    permission: "warehouse.edit",
    module: "warehouses",
  });
}
