import mongoose from "mongoose";
import { BundleInstance, BundleType, type IBundleComponent } from "@/server/models/bundle";
import { Inventory } from "@/server/models/inventory";
import { Product } from "@/server/models/product";
import { Site } from "@/server/models/site";
import { recordMovement, MovementError } from "@/server/services/movements";

export async function dispatchBundle(input: { bundleType: string; units: number; warehouse: string; project: string; userId: string }) {
  const type = await BundleType.findOne({ _id: input.bundleType, isDeleted: { $ne: true } }).lean<{
    code: string;
    components: { product: mongoose.Types.ObjectId; quantity: number }[];
  }>();
  if (!type) throw new MovementError("Bundle type not found", "NOT_FOUND");
  if (!(Number.isInteger(input.units) && input.units > 0)) throw new MovementError("Units must be a whole number above zero", "VALIDATION_ERROR");

  const need = type.components.map((c) => ({ product: String(c.product), quantity: c.quantity * input.units }));
  const [stock, products, site] = await Promise.all([
    Inventory.find({ warehouse: input.warehouse, product: { $in: need.map((n) => n.product) } }).lean<{ product: unknown; quantity: number }[]>(),
    Product.find({ _id: { $in: need.map((n) => n.product) } }).select("sku purchasePrice").lean<{ _id: unknown; sku: string; purchasePrice?: number }[]>(),
    Site.findOne({ project: input.project, isDeleted: { $ne: true } }).select("_id").lean<{ _id: unknown }>(),
  ]);
  const short = need.filter((n) => (stock.find((s) => String(s.product) === n.product)?.quantity ?? 0) < n.quantity);
  if (short.length) {
    const skus = short.map((s) => products.find((p) => String(p._id) === s.product)?.sku ?? s.product).join(", ");
    throw new MovementError(`Not enough stock in this warehouse for: ${skus}`, "INSUFFICIENT_STOCK");
  }

  const count = await BundleInstance.countDocuments();
  const number = `BND-${String(count + 1).padStart(6, "0")}`;
  const instanceId = new mongoose.Types.ObjectId();

  const components: IBundleComponent[] = [];
  for (const n of need) {
    await recordMovement({
      type: "site_issue",
      product: n.product,
      warehouse: input.warehouse,
      quantity: n.quantity,
      project: input.project,
      site: site ? String(site._id) : undefined,
      referenceType: "Bundle",
      referenceId: String(instanceId),
      notes: `Bundle ${number} (${type.code})`,
      userId: input.userId,
    });
    components.push({
      product: new mongoose.Types.ObjectId(n.product),
      quantity: n.quantity,
      rate: products.find((p) => String(p._id) === n.product)?.purchasePrice ?? 0,
      consumed: 0,
      returned: 0,
    });
  }

  return BundleInstance.create({
    _id: instanceId,
    number,
    bundleType: input.bundleType,
    units: input.units,
    warehouse: input.warehouse,
    project: input.project,
    site: site?._id,
    status: "at_site",
    components,
    dispatchedAt: new Date(),
    createdBy: input.userId,
  });
}

export async function settleBundle(id: string, lines: { product: string; consumed: number; returned: number }[], userId: string) {
  const inst = await BundleInstance.findById(id);
  if (!inst) throw new MovementError("Bundle not found", "NOT_FOUND");
  if (inst.status === "closed") throw new MovementError("This bundle is already closed", "INVALID_STATE");

  for (const l of lines) {
    const comp = (inst.components as IBundleComponent[]).find((c) => String(c.product) === l.product);
    if (!comp) throw new MovementError("Component not part of this bundle", "VALIDATION_ERROR");
    const consumed = Number(l.consumed) || 0;
    const returned = Number(l.returned) || 0;
    if (consumed < 0 || returned < 0) throw new MovementError("Quantities cannot be negative", "VALIDATION_ERROR");
    if (comp.consumed + comp.returned + consumed + returned > comp.quantity)
      throw new MovementError("More settled than the bundle holds for a component", "VALIDATION_ERROR");
  }

  for (const l of lines) {
    const comp = (inst.components as IBundleComponent[]).find((c) => String(c.product) === l.product)!;
    const base = {
      product: l.product,
      warehouse: String(inst.warehouse),
      project: String(inst.project),
      site: inst.site ? String(inst.site) : undefined,
      referenceType: "Bundle",
      referenceId: String(inst._id),
      userId,
    };
    if (Number(l.consumed) > 0) {
      await recordMovement({ ...base, type: "consumed", quantity: Number(l.consumed), notes: `Bundle ${inst.number} consumed` });
      comp.consumed += Number(l.consumed);
    }
    if (Number(l.returned) > 0) {
      await recordMovement({ ...base, type: "site_return", quantity: Number(l.returned), notes: `Bundle ${inst.number} returned` });
      comp.returned += Number(l.returned);
    }
  }

  if ((inst.components as IBundleComponent[]).every((c) => c.consumed + c.returned >= c.quantity)) {
    inst.status = "closed";
    inst.closedAt = new Date();
  }
  inst.markModified("components");
  await inst.save();
  return inst;
}
