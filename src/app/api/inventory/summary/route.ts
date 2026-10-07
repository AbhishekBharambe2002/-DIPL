import { connectDB } from "@/server/db/connection";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";
import { stockValuation, lowStockLines } from "@/server/services/stock";

export async function GET() {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("inventory.view"))
    return errorResponse("Forbidden", "FORBIDDEN", 403);

  const [valuation, low] = await Promise.all([stockValuation(), lowStockLines(1)]);
  return successResponse({ ...valuation, lowStock: low.count });
}
