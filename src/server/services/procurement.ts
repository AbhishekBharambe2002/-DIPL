import mongoose from "mongoose";
import { Product } from "@/server/models/product";
import { recordMovement } from "@/server/services/movements";
import { PurchaseOrder, type IPoLine, type PoStatus } from "@/server/models/purchase-order";
import { VendorInvoice, type IInvoiceLine } from "@/server/models/vendor-invoice";
import { createAuditLog } from "@/lib/audit";

export function poStatusFor(lines: Pick<IPoLine, "quantity" | "receivedQty">[], current?: PoStatus): PoStatus {
  if (current === "cancelled") return "cancelled";
  const received = lines.reduce((s, l) => s + (l.receivedQty ?? 0), 0);
  if (received <= 0) return "open";
  return lines.every((l) => (l.receivedQty ?? 0) >= l.quantity) ? "closed" : "partial";
}

export function poTotals(lines: Pick<IPoLine, "quantity" | "rate" | "receivedQty">[]) {
  const value = lines.reduce((s, l) => s + l.quantity * l.rate, 0);
  const receivedValue = lines.reduce((s, l) => s + Math.min(l.receivedQty ?? 0, l.quantity) * l.rate, 0);
  return { value, receivedValue, pendingValue: value - receivedValue };
}

export function invoiceTotals(lines: Pick<IInvoiceLine, "quantity" | "rate" | "gstPercent">[]) {
  const taxable = lines.reduce((s, l) => s + l.quantity * l.rate, 0);
  const gst = lines.reduce((s, l) => s + (l.quantity * l.rate * (l.gstPercent ?? 0)) / 100, 0);
  const r = (n: number) => Math.round(n * 100) / 100;
  return { taxable: r(taxable), gst: r(gst), total: r(taxable + gst) };
}

export class PostingError extends Error {}

export async function postInvoice(invoiceId: string, userId: string) {
  const claimed = await VendorInvoice.findOneAndUpdate(
    { _id: invoiceId, status: "draft" },
    { $set: { status: "posted", postedAt: new Date(), postedBy: userId } },
    { new: true }
  );
  if (!claimed) throw new PostingError("Invoice not found or already posted");

  const invoice = claimed as unknown as {
    _id: mongoose.Types.ObjectId;
    invoiceNo: string;
    warehouse: mongoose.Types.ObjectId;
    purchaseOrder?: mongoose.Types.ObjectId;
    lines: IInvoiceLine[];
  };

  for (const line of invoice.lines) {
    await recordMovement({
      type: "purchase",
      product: String(line.product),
      warehouse: String(invoice.warehouse),
      quantity: line.quantity,
      referenceType: "VendorInvoice",
      referenceId: String(invoice._id),
      notes: `Invoice ${invoice.invoiceNo}`,
      userId,
    });
    await Product.updateOne({ _id: line.product }, { $set: { purchasePrice: line.rate } });
  }

  if (invoice.purchaseOrder) {
    const po = await PurchaseOrder.findById(invoice.purchaseOrder);
    if (po && po.status !== "cancelled") {
      for (const line of invoice.lines) {
        let remaining = line.quantity;
        for (const pl of po.lines as IPoLine[]) {
          if (remaining <= 0) break;
          if (String(pl.product) !== String(line.product)) continue;
          const take = Math.min(remaining, Math.max(0, pl.quantity - (pl.receivedQty ?? 0)));
          pl.receivedQty = (pl.receivedQty ?? 0) + take;
          remaining -= take;
        }
      }
      po.status = poStatusFor(po.lines, po.status);
      await po.save();
    }
  }

  await createAuditLog({
    userId,
    action: "post",
    module: "invoices",
    recordId: String(invoice._id),
    newValue: { invoiceNo: invoice.invoiceNo, lines: invoice.lines.length },
  });

  return claimed;
}
