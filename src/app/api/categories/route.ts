import { NextRequest } from "next/server";
import { Category } from "@/server/models/category";
import { handleList, handleCreate } from "@/lib/api-handler";

export async function GET(req: NextRequest) {
  return handleList(req, {
    model: Category as never,
    permission: "product.view",
    searchFields: ["name"],
    populate: "parent",
  });
}

export async function POST(req: NextRequest) {
  return handleCreate(req, {
    model: Category as never,
    permission: "product.create",
    module: "categories",
  });
}
