import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connection";
import { BundleInstance, BundleType } from "@/server/models/bundle";
import { Inventory } from "@/server/models/inventory";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("inventory.view")) return errorResponse("Forbidden", "FORBIDDEN", 403);

  const [types, instances, stock] = await Promise.all([
    BundleType.find({ isDeleted: { $ne: true } }).populate("components.product", "sku name unit purchasePrice").sort({ code: 1 }).lean(),
    BundleInstance.find()
      .populate("bundleType", "code name")
      .populate("project", "projectId name")
      .populate("warehouse", "name")
      .populate("components.product", "sku name unit")
      .sort({ dispatchedAt: -1 })
      .limit(50)
      .lean(),
    Inventory.aggregate<{ _id: unknown; qty: number }>([{ $group: { _id: "$product", qty: { $sum: "$quantity" } } }]),
  ]);

  const stockOf = (id: unknown) => stock.find((s) => String(s._id) === String(id))?.qty ?? 0;
  type Comp = { product: { _id: unknown; sku: string; name: string; unit: string; purchasePrice?: number }; quantity: number };

  return successResponse({
    types: types.map((t) => {
      const comps = (t as { components: Comp[] }).components.map((c) => ({
        ...c,
        rate: c.product?.purchasePrice ?? 0,
        warehouseStock: stockOf(c.product?._id),
      }));
      return { ...t, components: comps, costPerUnit: comps.reduce((s, c) => s + c.quantity * c.rate, 0) };
    }),
    instances,
  });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("product.create")) return errorResponse("Forbidden", "FORBIDDEN", 403);

  const body = await req.json();
  const code = String(body.code ?? "").trim();
  const name = String(body.name ?? "").trim();
  const components = (Array.isArray(body.components) ? body.components : []).map((c: { product?: string; quantity?: unknown }) => ({
    product: c.product,
    quantity: Number(c.quantity),
  }));
  if (!code || !name) return errorResponse("Code and name are required", "VALIDATION_ERROR", 400);
  if (components.length === 0 || components.some((c: { product?: string; quantity: number }) => !mongoose.isValidObjectId(c.product) || !(c.quantity > 0)))
    return errorResponse("Every component needs a SKU and a quantity above zero", "VALIDATION_ERROR", 400);
  if (new Set(components.map((c: { product: string }) => c.product)).size !== components.length)
    return errorResponse("Each SKU can appear only once in a bundle", "VALIDATION_ERROR", 400);

  try {
    const t = await BundleType.create({ code, name, description: body.description, components, createdBy: user.id });
    await createAuditLog({ userId: user.id, action: "create", module: "bundles", recordId: t._id.toString(), newValue: { code, name } });
    return successResponse(t, 201);
  } catch (err) {
    if (err instanceof Error && err.message.includes("E11000")) return errorResponse("That bundle code already exists", "DUPLICATE", 409);
    throw err;
  }
}
