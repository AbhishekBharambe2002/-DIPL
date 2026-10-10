import { connectDB } from "@/server/db/connection";
import { Vendor } from "@/server/models/vendor";
import { Product } from "@/server/models/product";
import { StockTransaction } from "@/server/models/stock-transaction";
import { VendorInvoice } from "@/server/models/vendor-invoice";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";
import { stockValuation } from "@/server/services/stock";
import { computeEconomics } from "@/server/services/project-economics";

export async function GET() {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("dashboard.view")) return errorResponse("Forbidden", "FORBIDDEN", 403);

  const [suppliers, purchased, skus, movements, valuation, { economics }] = await Promise.all([
    Vendor.countDocuments({ isDeleted: { $ne: true } }),
    VendorInvoice.aggregate<{ value: number; count: number }>([
      { $match: { status: "posted" } },
      { $group: { _id: null, value: { $sum: "$taxable" }, count: { $sum: 1 } } },
    ]),
    Product.countDocuments({ isDeleted: { $ne: true } }),
    StockTransaction.countDocuments(),
    stockValuation(),
    computeEconomics({ status: { $ne: "cancelled" } }),
  ]);

  return successResponse({
    supplier: { suppliers, purchased: purchased[0]?.value ?? 0 },
    input: { bills: purchased[0]?.count ?? 0, skus },
    storage: { lines: valuation.lines, value: valuation.total + economics.reduce((s, e) => s + e.atSite, 0) },
    output: { movements, consumed: economics.reduce((s, e) => s + e.materialConsumed, 0) },
    customer: { projects: economics.length, contribution: economics.reduce((s, e) => s + e.contribution, 0) },
  });
}
