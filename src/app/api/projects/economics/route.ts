import { connectDB } from "@/server/db/connection";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";
import { computeEconomics } from "@/server/services/project-economics";

export async function GET() {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("project.view")) return errorResponse("Forbidden", "FORBIDDEN", 403);

  const { economics, materials } = await computeEconomics({ status: { $ne: "cancelled" } });
  const sum = (k: "contractValue" | "earned" | "atSite" | "contribution" | "totalCost") =>
    economics.reduce((s, e) => s + e[k], 0);

  return successResponse({
    summary: {
      total: economics.length,
      active: economics.filter((e) => e.status === "active").length,
      onHold: economics.filter((e) => e.status === "on_hold" || e.status === "delayed").length,
      contractValue: sum("contractValue"),
      earned: sum("earned"),
      atSite: sum("atSite"),
      totalCost: sum("totalCost"),
      contribution: sum("contribution"),
    },
    projects: economics,
    materials: materials
      .filter((m) => m.allocated > 0)
      .sort((a, b) => b.balanceValue - a.balanceValue)
      .slice(0, 40),
  });
}
