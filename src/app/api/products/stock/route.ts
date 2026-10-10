import { connectDB } from "@/server/db/connection";
import { Inventory } from "@/server/models/inventory";
import { Product } from "@/server/models/product";
import { Category } from "@/server/models/category";
import { ProjectMaterial } from "@/server/models/project-material";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";

export async function GET() {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("product.view")) return errorResponse("Forbidden", "FORBIDDEN", 403);

  const [rows, skus, categories, atSite] = await Promise.all([
    Inventory.aggregate<{ _id: unknown; qty: number; value: number; locations: number }>([
      { $match: { quantity: { $gt: 0 } } },
      { $lookup: { from: "products", localField: "product", foreignField: "_id", as: "p" } },
      { $unwind: "$p" },
      {
        $group: {
          _id: "$product",
          qty: { $sum: "$quantity" },
          value: { $sum: { $multiply: ["$quantity", { $ifNull: ["$p.purchasePrice", 0] }] } },
          locations: { $sum: 1 },
        },
      },
    ]),
    Product.countDocuments({ isDeleted: { $ne: true } }),
    Category.countDocuments({ isDeleted: { $ne: true } }),
    ProjectMaterial.aggregate<{ _id: unknown; qty: number; consumed: number; projects: number }>([
      {
        $group: {
          _id: "$product",
          qty: { $sum: { $max: ["$balance", 0] } },
          consumed: { $sum: "$consumed" },
          projects: { $sum: { $cond: [{ $gt: ["$balance", 0] }, 1, 0] } },
        },
      },
    ]),
  ]);

  return successResponse({
    summary: {
      skus,
      categories,
      carrying: rows.length,
      value: rows.reduce((s, r) => s + r.value, 0),
    },
    stock: Object.fromEntries(rows.map((r) => [String(r._id), { qty: r.qty, value: r.value, locations: r.locations }])),
    sites: Object.fromEntries(atSite.map((r) => [String(r._id), { qty: r.qty, consumed: r.consumed, projects: r.projects }])),
  });
}
