import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connection";
import { Project } from "@/server/models/project";
import { ProjectMaterial } from "@/server/models/project-material";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";
import { createAuditLog } from "@/lib/audit";
import { setPlannedMaterials } from "@/server/services/project-materials";
import { resolveCatalogItems, catalogItemsExist } from "@/server/services/catalog";

type Ctx = { params: Promise<{ id: string }> };

async function withCatalog(id: string) {
  const rows = await ProjectMaterial.find({ project: id, planned: { $gt: 0 } }).lean();
  const catalog = await resolveCatalogItems(rows.map((r) => r.product));
  return rows
    .map((r) => {
      const product = catalog.get(String(r.product));
      if (!product) return null; // catalogue item was deleted since
      return { ...r, product };
    })
    .filter((r): r is NonNullable<typeof r> => !!r);
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("project.view")) return errorResponse("Forbidden", "FORBIDDEN", 403);
  if (!mongoose.isValidObjectId(id)) return errorResponse("Not found", "NOT_FOUND", 404);

  return successResponse(await withCatalog(id));
}

// Replaces the expected-material list for a project: { items: [{ product, planned }] }.
export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("project.edit") && !user.permissions.includes("project.create"))
    return errorResponse("Forbidden", "FORBIDDEN", 403);
  if (!mongoose.isValidObjectId(id) || !(await Project.exists({ _id: id, isDeleted: { $ne: true } })))
    return errorResponse("Project not found", "NOT_FOUND", 404);

  const body = await req.json();
  const items = (Array.isArray(body.items) ? body.items : []).map((i: { product?: string; planned?: unknown }) => ({
    product: String(i.product ?? ""),
    planned: Number(i.planned),
  }));
  if (items.some((i: { product: string; planned: number }) => !mongoose.isValidObjectId(i.product) || !(i.planned >= 0)))
    return errorResponse("Every expected material needs a product and a quantity", "VALIDATION_ERROR", 400);
  if (new Set(items.map((i: { product: string }) => i.product)).size !== items.length)
    return errorResponse("A product can appear only once", "VALIDATION_ERROR", 400);
  if (!(await catalogItemsExist(items.map((i: { product: string }) => i.product))))
    return errorResponse("One or more materials no longer exist", "VALIDATION_ERROR", 400);

  await setPlannedMaterials(id, items);
  await createAuditLog({
    userId: user.id,
    action: "update",
    module: "project_materials",
    recordId: id,
    newValue: { expectedMaterials: items.length },
  });

  return successResponse(await withCatalog(id));
}
