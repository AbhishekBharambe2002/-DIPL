import { connectDB } from "@/server/db/connection";
import { StockTransaction } from "@/server/models/stock-transaction";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";

export async function GET() {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("inventory.view")) return errorResponse("Forbidden", "FORBIDDEN", 403);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today.getTime() - 6 * 86400000);

  const [total, postedToday, lastWeek, byType] = await Promise.all([
    StockTransaction.countDocuments(),
    StockTransaction.countDocuments({ createdAt: { $gte: today } }),
    StockTransaction.countDocuments({ createdAt: { $gte: weekAgo } }),
    StockTransaction.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$type", count: { $sum: 1 } } }]),
  ]);

  return successResponse({
    total,
    postedToday,
    lastWeek,
    byType: Object.fromEntries(byType.map((t) => [t._id, t.count])),
  });
}
