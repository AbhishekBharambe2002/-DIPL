import mongoose, { Schema, type Document } from "mongoose";

/**
 * Primary order — the first-draft purchase order flow:
 * pick a vendor, pick materials (from the Excel-imported catalogue),
 * pick a destination (warehouse / inventory, or straight to a project site).
 */
export const PRIMARY_ORDER_DESTINATIONS = ["inventory", "project"] as const;
export type PrimaryOrderDestination = (typeof PRIMARY_ORDER_DESTINATIONS)[number];

export interface IPrimaryOrderLine {
  material: mongoose.Types.ObjectId;  // ref → Material
  productId: string;                  // copied for quick display
  name: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;                     // quantity × rate
}

export interface IPrimaryOrder extends Document {
  orderNo: string;
  vendor: mongoose.Types.ObjectId;    // ref → Vendor
  lines: IPrimaryOrderLine[];
  totalAmount: number;
  expectedDate: Date;
  destination: PrimaryOrderDestination;
  project?: mongoose.Types.ObjectId;  // required when destination === "project"
  notes?: string;
  status: "draft" | "placed" | "delivered";
  deliveredAt?: Date;
  deliveredBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PrimaryOrderLineSchema = new Schema<IPrimaryOrderLine>(
  {
    material: { type: Schema.Types.ObjectId, ref: "Material", required: true },
    productId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PrimaryOrderSchema = new Schema<IPrimaryOrder>(
  {
    orderNo: { type: String, required: true, unique: true, trim: true },
    vendor: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    lines: { type: [PrimaryOrderLineSchema], validate: (v: unknown[]) => v.length > 0 },
    totalAmount: { type: Number, default: 0 },
    expectedDate: { type: Date, required: true },
    destination: { type: String, enum: PRIMARY_ORDER_DESTINATIONS, required: true, default: "inventory" },
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    notes: { type: String, trim: true },
    status: { type: String, enum: ["draft", "placed", "delivered"], default: "placed" },
    deliveredAt: { type: Date },
    deliveredBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

PrimaryOrderSchema.index({ vendor: 1 });
PrimaryOrderSchema.index({ createdAt: -1 });
PrimaryOrderSchema.index({ project: 1 });
PrimaryOrderSchema.index({ destination: 1, status: 1, expectedDate: 1 });

// In dev, hot reload re-runs this file; drop the cached model so schema changes apply without a restart.
if (process.env.NODE_ENV !== "production" && mongoose.models.PrimaryOrder) mongoose.deleteModel("PrimaryOrder");

export const PrimaryOrder =
  mongoose.models.PrimaryOrder || mongoose.model<IPrimaryOrder>("PrimaryOrder", PrimaryOrderSchema);
