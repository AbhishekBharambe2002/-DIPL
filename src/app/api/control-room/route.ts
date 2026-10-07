import { connectDB } from "@/server/db/connection";
import { StockTransaction } from "@/server/models/stock-transaction";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";
import { mapLocations } from "@/server/services/locations";

export async function GET() {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("dashboard.view")) return errorResponse("Forbidden", "FORBIDDEN", 403);

  const [locations, moves] = await Promise.all([
    mapLocations(),
    StockTransaction.find()
      .populate("product", "sku name unit purchasePrice")
      .populate("warehouse", "name")
      .populate("project", "projectId")
      .sort({ createdAt: -1 })
      .limit(15)
      .lean(),
  ]);

  return successResponse({
    locations,
    moves: moves.map((m) => {
      const t = m as {
        _id: unknown;
        type: string;
        quantity: number;
        createdAt: Date;
        product?: { sku: string; name: string; unit: string; purchasePrice?: number };
        warehouse?: { name: string };
        project?: { projectId: string };
      };
      return {
        id: String(t._id),
        type: t.type,
        quantity: t.quantity,
        createdAt: t.createdAt,
        sku: t.product?.sku ?? "",
        unit: t.product?.unit ?? "",
        value: t.quantity * (t.product?.purchasePrice ?? 0),
        warehouse: t.warehouse?.name ?? "",
        project: t.project?.projectId ?? "",
      };
    }),
  });
}
