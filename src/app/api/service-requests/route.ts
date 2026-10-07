import { NextRequest } from "next/server";
import { ServiceRequest } from "@/server/models/service-request";
import { handleList, handleCreate } from "@/lib/api-handler";

export async function GET(req: NextRequest) {
  return handleList(req, {
    model: ServiceRequest as never,
    permission: "service.view",
    searchFields: ["serviceId", "complaint", "equipment"],
    populate: ["customer", "site", "assignedTo"],
    filterFn: (p) => {
      const f: Record<string, unknown> = {};
      if (p.get("status")) f.status = p.get("status");
      if (p.get("customer")) f.customer = p.get("customer");
      if (p.get("priority")) f.priority = p.get("priority");
      return f;
    },
  });
}

export async function POST(req: NextRequest) {
  return handleCreate(req, {
    model: ServiceRequest as never,
    permission: "service.create",
    module: "service_requests",
  });
}
