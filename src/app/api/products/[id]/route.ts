import { NextRequest } from "next/server";
import { Product } from "@/server/models/product";
import { handleGet, handleUpdate } from "@/lib/api-handler";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleGet(id, { model: Product as never, permission: "product.view", populate: "category" });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleUpdate(id, req, {
    model: Product as never,
    permission: "product.edit",
    module: "products",
  });
}
