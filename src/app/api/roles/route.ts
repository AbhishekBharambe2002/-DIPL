import { NextRequest } from "next/server";
import { Role } from "@/server/models/role";
import { handleList, handleCreate } from "@/lib/api-handler";

export async function GET(req: NextRequest) {
  return handleList(req, {
    model: Role as never,
    permission: "role.view",
    searchFields: ["name", "code"],
  });
}

export async function POST(req: NextRequest) {
  return handleCreate(req, {
    model: Role as never,
    permission: "role.create",
    module: "roles",
  });
}
