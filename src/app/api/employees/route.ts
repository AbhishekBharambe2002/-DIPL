import { NextRequest } from "next/server";
import { Employee } from "@/server/models/employee";
import { handleList, handleCreate } from "@/lib/api-handler";

export async function GET(req: NextRequest) {
  return handleList(req, {
    model: Employee as never,
    permission: "employee.view",
    searchFields: ["name", "employeeId", "phone", "email"],
  });
}

export async function POST(req: NextRequest) {
  return handleCreate(req, {
    model: Employee as never,
    permission: "employee.create",
    module: "employees",
  });
}
