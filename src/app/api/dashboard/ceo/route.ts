import { connectDB } from "@/server/db/connection";
import { Project } from "@/server/models/project";
import { PrimaryOrder } from "@/server/models/primary-order";
import { ProjectSiteLog } from "@/server/models/project-site-log";
import { Material } from "@/server/models/material";
import { InventoryLog } from "@/server/models/inventory-log";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";

export async function GET() {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("dashboard.view"))
    return errorResponse("Forbidden", "FORBIDDEN", 403);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayFilter = { $gte: todayStart, $lte: todayEnd };

  const [
    dispatchesToday,
    dispatchesTodayDetails,
    posRaisedToday,
    posRaisedTodayDetails,
    posDueToday,
    posDueTodayDetails,
    newProjectsToday,
    newProjectsTodayDetails,
    lowStockCount,
    pendingDeliveries,
    totalActiveProjects,
    totalPOValue,
  ] = await Promise.all([
    ProjectSiteLog.countDocuments({ type: "dispatch", date: todayFilter }),
    ProjectSiteLog.find({ type: "dispatch", date: todayFilter })
      .populate("project", "projectId name")
      .populate("material", "name unit")
      .sort({ date: -1 })
      .limit(10)
      .lean(),

    PrimaryOrder.countDocuments({ createdAt: todayFilter }),
    PrimaryOrder.find({ createdAt: todayFilter })
      .populate("vendor", "companyName")
      .select("orderNo vendor totalAmount status lines")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),

    PrimaryOrder.countDocuments({
      expectedDate: todayFilter,
      status: { $ne: "delivered" },
    }),
    PrimaryOrder.find({
      expectedDate: todayFilter,
      status: { $ne: "delivered" },
    })
      .populate("vendor", "companyName")
      .populate("project", "projectId name")
      .select("orderNo vendor totalAmount status expectedDate lines project")
      .sort({ expectedDate: 1 })
      .limit(10)
      .lean(),

    Project.countDocuments({ createdAt: todayFilter, isDeleted: { $ne: true } }),
    Project.find({ createdAt: todayFilter, isDeleted: { $ne: true } })
      .select("projectId name status contractValue")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),

    InventoryLog.aggregate([
      {
        $lookup: {
          from: "materials",
          localField: "material",
          foreignField: "_id",
          as: "mat",
        },
      },
      { $unwind: "$mat" },
      { $match: { "mat.minStock": { $gt: 0 }, $expr: { $lt: ["$quantityToDispatch", "$mat.minStock"] } } },
      { $count: "n" },
    ]).then((r) => r[0]?.n ?? 0),

    ProjectSiteLog.countDocuments({ type: "dispatch", deliveryStatus: "in_transit" }),
    Project.countDocuments({ isDeleted: { $ne: true }, status: "active" }),
    PrimaryOrder.aggregate([
      { $match: { createdAt: todayFilter } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]).then((r) => r[0]?.total ?? 0),
  ]);

  return successResponse({
    today: {
      dispatches: dispatchesToday,
      dispatchDetails: dispatchesTodayDetails,
      posRaised: posRaisedToday,
      posRaisedDetails: posRaisedTodayDetails,
      posDueToday: posDueToday,
      posDueDetails: posDueTodayDetails,
      newProjects: newProjectsToday,
      newProjectDetails: newProjectsTodayDetails,
      lowStock: lowStockCount,
      pendingDeliveries,
      activeProjects: totalActiveProjects,
      poValueToday: totalPOValue,
    },
  });
}
