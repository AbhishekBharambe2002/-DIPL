import { NextRequest } from "next/server";
import type { PipelineStage } from "mongoose";
import { connectDB } from "@/server/db/connection";
import { InventoryLog } from "@/server/models/inventory-log";
import { getAuthenticatedUser, errorResponse, paginatedResponse, parsePaginationParams } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("inventory.view"))
    return errorResponse("Forbidden", "FORBIDDEN", 403);

  const params = req.nextUrl.searchParams;
  const { page, limit, sort, search, skip } = parsePaginationParams(params);

  // Build aggregation pipeline: join inventory_logs → materials
  const pipeline: PipelineStage[] = [
    {
      $lookup: {
        from: "materials",
        localField: "material",
        foreignField: "_id",
        as: "mat",
      },
    },
    { $unwind: "$mat" },
    { $match: { "mat.isActive": true } },
  ];

  // Filter by sheet
  if (params.get("sheet")) {
    pipeline.push({ $match: { "mat.sheet": params.get("sheet") } });
  }

  // Text search across productId, name, make, size
  if (search) {
    const re = { $regex: search, $options: "i" };
    pipeline.push({
      $match: {
        $or: [
          { productId: re },
          { "mat.name": re },
          { "mat.make": re },
          { "mat.size": re },
        ],
      },
    });
  }

  // Project into flat shape
  pipeline.push({
    $project: {
      productId: 1,
      name: "$mat.name",
      category: "$mat.category",
      make: "$mat.make",
      size: "$mat.size",
      unit: "$mat.unit",
      sheet: "$mat.sheet",
      quantity: 1,
      purchasePrice: 1,
      totalValue: { $multiply: ["$quantity", "$purchasePrice"] },
    },
  });

  // Sort
  const sortField = sort || "-totalValue";
  const sortObj: Record<string, 1 | -1> = {};
  if (sortField.startsWith("-")) sortObj[sortField.slice(1)] = -1;
  else sortObj[sortField] = 1;

  // Count total before pagination
  const countPipeline: PipelineStage[] = [...pipeline, { $count: "total" as const }];
  const [countResult] = await InventoryLog.aggregate(countPipeline);
  const total = countResult?.total ?? 0;

  pipeline.push({ $sort: sortObj }, { $skip: skip }, { $limit: limit });

  const data = await InventoryLog.aggregate(pipeline);

  return paginatedResponse(data, total, page, limit);
}
