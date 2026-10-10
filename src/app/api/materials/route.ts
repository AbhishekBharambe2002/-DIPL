import { NextRequest } from "next/server";
import { connectDB } from "@/server/db/connection";
import { Material } from "@/server/models/material";
import { InventoryLog } from "@/server/models/inventory-log";
import { getAuthenticatedUser, errorResponse, paginatedResponse, successResponse, parsePaginationParams } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("product.view"))
    return errorResponse("Forbidden", "FORBIDDEN", 403);

  const params = req.nextUrl.searchParams;

  // Summary mode — return counts per sheet/category + total stock value
  if (params.get("summary") === "true") {
    const [totalCount, sheets, categories, valueAgg] = await Promise.all([
      Material.countDocuments({ isActive: true }),
      Material.distinct("sheet", { isActive: true }),
      Material.distinct("category", { isActive: true }),
      InventoryLog.aggregate([
        { $group: { _id: null, totalValue: { $sum: "$totalValue" }, totalQty: { $sum: "$quantity" } } },
      ]),
    ]);
    return successResponse({
      total: totalCount,
      sheets,
      categories,
      stockValue: valueAgg[0]?.totalValue ?? 0,
      stockQty: valueAgg[0]?.totalQty ?? 0,
    });
  }

  const { page, limit, sort, search, skip } = parsePaginationParams(params);

  const filter: Record<string, unknown> = { isActive: true };

  if (params.get("sheet")) filter.sheet = params.get("sheet");
  if (params.get("category")) filter.category = params.get("category");

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { make: { $regex: search, $options: "i" } },
      { modelNo: { $regex: search, $options: "i" } },
      { size: { $regex: search, $options: "i" } },
      { productId: { $regex: search, $options: "i" } },
    ];
  }

  const sortObj: Record<string, 1 | -1> = {};
  if (sort.startsWith("-")) sortObj[sort.slice(1)] = -1;
  else sortObj[sort || "productId"] = 1;

  const [data, total] = await Promise.all([
    Material.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
    Material.countDocuments(filter),
  ]);

  // Attach inventory info (qty, price, date) from inventory_logs
  const materialIds = data.map((d) => d._id);
  const logs = await InventoryLog.find({ material: { $in: materialIds } }).lean();
  const logMap = new Map(logs.map((l) => [String(l.material), l]));

  const enriched = data.map((d) => {
    const log = logMap.get(String(d._id));
    return {
      ...d,
      quantity: log?.quantity ?? 0, // lifetime total ever received
      available: log?.quantityToDispatch ?? 0, // what's actually left to dispatch right now
      purchasePrice: log?.purchasePrice ?? 0,
      totalValue: log?.totalValue ?? 0,
      addedAt: log?.addedAt ?? null,
    };
  });

  return paginatedResponse(enriched, total, page, limit);
}
