import { NextRequest } from "next/server";
import { Vendor } from "@/server/models/vendor";
import { handleList, handleCreate } from "@/lib/api-handler";

export async function GET(req: NextRequest) {
  return handleList(req, {
    model: Vendor as never,
    permission: "vendor.view",
    searchFields: ["vendorName", "contactPerson", "phone", "email"],
  });
}

export async function POST(req: NextRequest) {
  return handleCreate(req, {
    model: Vendor as never,
    permission: "vendor.create",
    module: "vendors",
  });
}
