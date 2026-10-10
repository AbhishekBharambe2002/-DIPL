import { NextRequest } from "next/server";
import { connectDB } from "@/server/db/connection";
import { Project } from "@/server/models/project";
import { Site } from "@/server/models/site";
import { Customer } from "@/server/models/customer";
import { Material } from "@/server/models/material";
import { Employee } from "@/server/models/employee";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);

  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) return successResponse({ results: [] });

  const regex = { $regex: q, $options: "i" };
  const limit = 5;

  const [projects, sites, customers, materials, employees] = await Promise.all([
    Project.find({ isDeleted: { $ne: true }, $or: [{ name: regex }, { projectId: regex }] })
      .select("name projectId status").limit(limit).lean(),
    Site.find({ isDeleted: { $ne: true }, $or: [{ name: regex }, { siteId: regex }, { city: regex }] })
      .select("name siteId status").limit(limit).lean(),
    Customer.find({ isDeleted: { $ne: true }, $or: [{ companyName: regex }, { contactPerson: regex }] })
      .select("companyName contactPerson").limit(limit).lean(),
    Material.find({ isActive: true, $or: [{ name: regex }, { productId: regex }, { make: regex }, { size: regex }] })
      .select("name productId").limit(limit).lean(),
    Employee.find({ isDeleted: { $ne: true }, $or: [{ name: regex }, { employeeId: regex }] })
      .select("name employeeId role").limit(limit).lean(),
  ]);

  return successResponse({
    results: [
      ...projects.map((p) => ({ type: "project", ...p })),
      ...sites.map((s) => ({ type: "site", ...s })),
      ...customers.map((c) => ({ type: "customer", ...c })),
      ...materials.map((m) => ({ type: "product", _id: m._id, name: m.name, sku: m.productId })),
      ...employees.map((e) => ({ type: "employee", ...e })),
    ],
  });
}
