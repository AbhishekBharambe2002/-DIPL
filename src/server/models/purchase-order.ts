import mongoose, { Schema, type Document } from "mongoose";

export const PO_STATUSES = ["open", "partial", "closed", "cancelled"] as const;
export type PoStatus = (typeof PO_STATUSES)[number];

export interface IPoLine {
  product: mongoose.Types.ObjectId;
  quantity: number;
  rate: number;
  receivedQty: number;
}

export interface IPurchaseOrder extends Document {
  poNumber: string;
  vendor: mongoose.Types.ObjectId;
  project?: mongoose.Types.ObjectId;
  date: Date;
  expectedDate?: Date;
  status: PoStatus;
  lines: IPoLine[];
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PoLineSchema = new Schema<IPoLine>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    receivedQty: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    poNumber: { type: String, required: true, unique: true, trim: true },
    vendor: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    date: { type: Date, required: true },
    expectedDate: { type: Date },
    status: { type: String, enum: PO_STATUSES, default: "open" },
    lines: { type: [PoLineSchema], validate: (v: unknown[]) => v.length > 0 },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

PurchaseOrderSchema.index({ status: 1, date: -1 });
PurchaseOrderSchema.index({ vendor: 1 });

export const PurchaseOrder =
  mongoose.models.PurchaseOrder || mongoose.model<IPurchaseOrder>("PurchaseOrder", PurchaseOrderSchema);
