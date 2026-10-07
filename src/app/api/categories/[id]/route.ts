import { NextRequest } from "next/server";
import { Category } from "@/server/models/category";
import { handleGet, handleUpdate } from "@/lib/api-handler";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleGet(id, { model: Category as never, permission: "product.view" });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleUpdate(id, req, {
    model: Category as never,
    permission: "product.edit",
    module: "categories",
  });
}
