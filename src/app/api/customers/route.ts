import { NextRequest } from "next/server";
import { Customer } from "@/server/models/customer";
import { handleList, handleCreate } from "@/lib/api-handler";

export async function GET(req: NextRequest) {
  return handleList(req, {
    model: Customer as never,
    permission: "customer.view",
    searchFields: ["companyName", "contactPerson", "phone", "email"],
  });
}

export async function POST(req: NextRequest) {
  return handleCreate(req, {
    model: Customer as never,
    permission: "customer.create",
    module: "customers",
  });
}
