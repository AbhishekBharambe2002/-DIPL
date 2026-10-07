import { NextRequest } from "next/server";
import { Warehouse } from "@/server/models/warehouse";
import { handleList, handleCreate } from "@/lib/api-handler";

export async function GET(req: NextRequest) {
  return handleList(req, {
    model: Warehouse as never,
    permission: "warehouse.view",
    searchFields: ["name", "location"],
  });
}

export async function POST(req: NextRequest) {
  return handleCreate(req, {
    model: Warehouse as never,
    permission: "warehouse.create",
    module: "warehouses",
  });
}
