import { connectDB } from "@/server/db/connection";
import { Material } from "@/server/models/material";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";

/**
 * Materials whose dispatchable quantity has dropped below their minStock
 * threshold — what the low-stock alert bell shows, and what "Raise order
 * for shortfall" on the new-order page gets pre-filled with.
 *
 * Each item also carries the distinct projects it has been dispatched to
 * (via project-site-logs), so the alert can be grouped project-wise.
 */
export async function GET() {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("product.view")) return errorResponse("Forbidden", "FORBIDDEN", 403);

  const rows = await Material.aggregate([
    { $match: { isActive: true, minStock: { $gt: 0 } } },
    { $lookup: { from: "inventorylogs", localField: "_id", foreignField: "material", as: "log" } },
    { $unwind: { path: "$log", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        productId: 1,
        name: 1,
        category: 1,
        make: 1,
        size: 1,
        unit: 1,
        minStock: 1,
        quantity: { $ifNull: ["$log.quantityToDispatch", 0] },
        rate: { $ifNull: ["$log.purchasePrice", 0] },
      },
    },
    { $match: { $expr: { $lt: ["$quantity", "$minStock"] } } },
    { $addFields: { shortBy: { $subtract: ["$minStock", "$quantity"] } } },
    // Which projects has this material actually gone out to?
    {
      $lookup: {
        from: "projectsitelogs",
        let: { materialId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$material", "$$materialId"] } } },
          { $group: { _id: "$project" } },
          { $lookup: { from: "projects", localField: "_id", foreignField: "_id", as: "p" } },
          { $unwind: "$p" },
          { $project: { _id: "$p._id", projectId: "$p.projectId", name: "$p.name" } },
        ],
        as: "projects",
      },
    },
    { $sort: { shortBy: -1 } },
  ]);

  return successResponse({ count: rows.length, items: rows });
}
