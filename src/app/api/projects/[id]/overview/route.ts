import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connection";
import { Project } from "@/server/models/project";
import { BoqItem } from "@/server/models/boq-item";
import { ProjectCost } from "@/server/models/project-cost";
import { StockTransaction } from "@/server/models/stock-transaction";
import { ProjectSiteLog } from "@/server/models/project-site-log";
import { Site } from "@/server/models/site";
import { Task } from "@/server/models/task";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";
import { computeEconomics, SITE_MOVES } from "@/server/services/project-economics";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("project.view")) return errorResponse("Forbidden", "FORBIDDEN", 403);
  if (!mongoose.isValidObjectId(id)) return errorResponse("Not found", "NOT_FOUND", 404);

  const project = await Project.findOne({ _id: id, isDeleted: { $ne: true } })
    .populate("customer", "companyName contactPerson city")
    .populate("projectManager", "name")
    .populate("projectEngineer", "name")
    .lean();
  if (!project) return errorResponse("Not found", "NOT_FOUND", 404);

  const oid = new mongoose.Types.ObjectId(id);
  const [{ economics, materials }, boq, costs, oldTransactions, siteLogs, sites, tasks] = await Promise.all([
    computeEconomics({ _id: oid }),
    BoqItem.find({ project: oid }).sort({ itemNo: 1 }).lean(),
    ProjectCost.find({ project: oid }).sort({ date: -1 }).lean(),
    StockTransaction.find({ project: oid, type: { $in: SITE_MOVES } })
      .populate("product", "sku name unit purchasePrice")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    ProjectSiteLog.find({ project: oid })
      .populate("material", "productId name unit category")
      .populate("createdBy", "name")
      .sort({ date: -1 })
      .limit(20)
      .lean(),
    Site.find({ project: oid, isDeleted: { $ne: true } }).select("siteId name city status").lean(),
    Task.find({ project: oid, isDeleted: { $ne: true }, status: { $ne: "completed" } })
      .select("title status priority dueDate")
      .sort({ dueDate: 1 })
      .limit(8)
      .lean(),
  ]);

  // Merge old stock transactions and new site logs into a unified transactions array
  const TYPE_MAP: Record<string, string> = { dispatch: "site_issue", consumed: "consumed", returned: "site_return" };
  const newTransactions = siteLogs.map((l) => {
    const mat = l.material as unknown as { productId: string; name: string; unit: string; category: string } | null;
    return {
      _id: l._id,
      type: TYPE_MAP[l.type] ?? l.type,
      quantity: l.quantity,
      createdAt: l.date,
      notes: l.note,
      product: mat
        ? { sku: mat.productId, name: mat.name, unit: mat.unit, purchasePrice: l.rate }
        : undefined,
      createdBy: l.createdBy as unknown as { name: string } | undefined,
    };
  });

  // Combine and sort by date descending, take top 20
  const allTransactions = [...oldTransactions, ...newTransactions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);

  return successResponse({
    project,
    economics: economics[0],
    materials: materials.sort((a, b) => b.balanceValue - a.balanceValue),
    boq,
    costs,
    transactions: allTransactions,
    sites,
    tasks,
  });
}
