import { connectDB } from "@/server/db/connection";
import { PurchaseOrder } from "@/server/models/purchase-order";
import { VendorInvoice } from "@/server/models/vendor-invoice";
import { getAuthenticatedUser, errorResponse, successResponse } from "@/lib/api-utils";
import { poTotals } from "@/server/services/procurement";

export async function GET() {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("purchase_order.view") && !user.permissions.includes("goods_receipt.view"))
    return errorResponse("Forbidden", "FORBIDDEN", 403);

  const [openPos, statusCounts, purchases, byVendor, drafts] = await Promise.all([
    PurchaseOrder.find({ status: { $in: ["open", "partial"] } }).select("lines").lean<{ lines: { quantity: number; rate: number; receivedQty: number }[] }[]>(),
    PurchaseOrder.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    VendorInvoice.aggregate<{ total: number; taxable: number; count: number }>([
      { $match: { status: "posted" } },
      { $group: { _id: null, total: { $sum: "$total" }, taxable: { $sum: "$taxable" }, count: { $sum: 1 } } },
    ]),
    VendorInvoice.aggregate<{ _id: unknown; name: string; value: number; invoices: number }>([
      { $match: { status: "posted" } },
      { $group: { _id: "$vendor", value: { $sum: "$taxable" }, invoices: { $sum: 1 } } },
      { $lookup: { from: "vendors", localField: "_id", foreignField: "_id", as: "v" } },
      { $unwind: "$v" },
      { $project: { name: "$v.vendorName", value: 1, invoices: 1 } },
      { $sort: { value: -1 } },
    ]),
    VendorInvoice.countDocuments({ status: "draft" }),
  ]);

  const open = openPos.map((p) => poTotals(p.lines));
  return successResponse({
    openCount: openPos.length,
    openValue: open.reduce((s, t) => s + t.value, 0),
    pendingValue: open.reduce((s, t) => s + t.pendingValue, 0),
    purchased: purchases[0]?.taxable ?? 0,
    purchasedGross: purchases[0]?.total ?? 0,
    postedInvoices: purchases[0]?.count ?? 0,
    draftInvoices: drafts,
    statusCounts: Object.fromEntries(statusCounts.map((s) => [s._id, s.count])),
    vendors: byVendor.map((v) => ({ id: String(v._id), name: v.name, value: v.value, invoices: v.invoices })),
  });
}
