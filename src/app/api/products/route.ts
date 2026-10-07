import { NextRequest } from "next/server";
import { Product } from "@/server/models/product";
import { handleList, handleCreate } from "@/lib/api-handler";

export async function GET(req: NextRequest) {
  return handleList(req, {
    model: Product as never,
    permission: "product.view",
    searchFields: ["name", "sku", "brand"],
    populate: "category",
    filterFn: (p) => {
      const f: Record<string, unknown> = {};
      if (p.get("category")) f.category = p.get("category");
      if (p.get("isActive")) f.isActive = p.get("isActive") === "true";
      return f;
    },
  });
}

export async function POST(req: NextRequest) {
  return handleCreate(req, {
    model: Product as never,
    permission: "product.create",
    module: "products",
  });
}
