import { NextRequest } from "next/server";
import { ServiceRequest } from "@/server/models/service-request";
import { handleGet, handleUpdate } from "@/lib/api-handler";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleGet(id, {
    model: ServiceRequest as never,
    permission: "service.view",
    populate: ["customer", "site", "assignedTo"],
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleUpdate(id, req, {
    model: ServiceRequest as never,
    permission: "service.view",
    module: "service_requests",
  });
}
