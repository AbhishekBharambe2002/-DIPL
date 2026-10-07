import { connectDB } from "@/server/db/connection";
import { computeEconomics } from "@/server/services/project-economics";
import { Site } from "@/server/models/site";
import { Task } from "@/server/models/task";
import { ServiceRequest } from "@/server/models/service-request";
import { StockTransaction } from "@/server/models/stock-transaction";
import { AuditLog } from "@/server/models/audit-log";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";
import { stockValuation, lowStockLines } from "@/server/services/stock";

const live = { isDeleted: { $ne: true } };

export async function GET() {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("dashboard.view"))
    return errorResponse("Forbidden", "FORBIDDEN", 403);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    projects,
    sitesByStatus,
    taskCounts,
    overdueTasks,
    blockedTasks,
    urgentService,
    openService,
    movesToday,
    recentActivity,
    valuation,
    low,
  ] = await Promise.all([
    computeEconomics({ status: { $ne: "cancelled" } }),
    Site.aggregate([{ $match: live }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Task.aggregate([{ $match: live }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Task.find({ ...live, status: { $ne: "completed" }, dueDate: { $lt: today } })
      .select("title dueDate priority")
      .sort({ dueDate: 1 })
      .limit(5)
      .lean(),
    Task.find({ ...live, status: "blocked" }).select("title description").limit(5).lean(),
    ServiceRequest.find({
      ...live,
      status: { $nin: ["completed", "closed", "cancelled"] },
      priority: { $in: ["critical", "high"] },
    })
      .select("serviceId complaint priority status")
      .limit(5)
      .lean(),
    ServiceRequest.countDocuments({ ...live, status: { $nin: ["completed", "closed", "cancelled"] } }),
    StockTransaction.countDocuments({ createdAt: { $gte: today } }),
    AuditLog.find().populate("user", "name").sort({ createdAt: -1 }).limit(8).lean(),
    stockValuation(),
    lowStockLines(5),
  ]);

  const projectRows = projects.economics.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    status: p.status,
    location: p.location,
    budget: p.contractValue,
    progress: p.progress,
    earned: p.earned,
    contribution: p.contribution,
  }));

  const contractValue = projectRows.reduce((s, p) => s + p.budget, 0);
  const earned = projectRows.reduce((s, p) => s + p.earned, 0);
  const taskMap = Object.fromEntries(taskCounts.map((t: { _id: string; count: number }) => [t._id, t.count]));

  return successResponse({
    portfolio: {
      contractValue,
      earned,
      materialConsumed: projects.economics.reduce((s, p) => s + p.materialConsumed, 0),
      contribution: projects.economics.reduce((s, p) => s + p.contribution, 0),
      activeProjects: projectRows.filter((p) => p.status === "active").length,
      liveProjects: projectRows.filter((p) => p.status !== "completed").length,
    },
    stock: { ...valuation, lowStock: low.count, lowStockItems: low.items, movesToday },
    tasks: {
      open: (taskMap.todo ?? 0) + (taskMap.in_progress ?? 0),
      inProgress: taskMap.in_progress ?? 0,
      blocked: taskMap.blocked ?? 0,
      completed: taskMap.completed ?? 0,
      overdue: overdueTasks.length,
      overdueItems: overdueTasks,
      blockedItems: blockedTasks,
    },
    service: { open: openService, urgentItems: urgentService },
    sitesByStatus: sitesByStatus.map((s: { _id: string; count: number }) => ({ status: s._id, count: s.count })),
    projects: projectRows.filter((p) => p.status !== "completed").slice(0, 8),
    recentActivity: recentActivity.map((a) => {
      const r = a as { _id: unknown; action: string; module: string; user?: { name: string }; createdAt: Date };
      return { id: String(r._id), action: r.action, module: r.module, user: r.user?.name ?? "System", createdAt: r.createdAt };
    }),
  });
}
