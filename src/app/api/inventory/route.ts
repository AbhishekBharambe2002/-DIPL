import { NextRequest } from "next/server";
import { connectDB } from "@/server/db/connection";
import { Inventory } from "@/server/models/inventory";
import { Product } from "@/server/models/product";
import {
  getAuthenticatedUser,
  errorResponse,
  paginatedResponse,
  parsePaginationParams,
} from "@/lib/api-utils";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(req: NextRequest) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("inventory.view"))
    return errorResponse("Forbidden", "FORBIDDEN", 403);

  const params = req.nextUrl.searchParams;
  const { page, limit, skip, search } = parsePaginationParams(params);

  const filter: Record<string, unknown> = {};
  if (params.get("warehouse")) filter.warehouse = params.get("warehouse");
  if (params.get("product")) filter.product = params.get("product");

  if (search) {
    const re = { $regex: escapeRegex(search), $options: "i" };
    const ids = await Product.find({ $or: [{ name: re }, { sku: re }] }).distinct("_id");
    filter.product = { $in: ids };
  }

  const [data, total] = await Promise.all([
    Inventory.find(filter)
      .populate("product")
      .populate("warehouse")
      .sort({ quantity: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Inventory.countDocuments(filter),
  ]);

  return paginatedResponse(data, total, page, limit);
}
