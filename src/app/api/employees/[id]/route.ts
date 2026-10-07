import { NextRequest } from "next/server";
import { Employee } from "@/server/models/employee";
import { handleGet, handleUpdate } from "@/lib/api-handler";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleGet(id, { model: Employee as never, permission: "employee.view" });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleUpdate(id, req, {
    model: Employee as never,
    permission: "employee.edit",
    module: "employees",
  });
}
