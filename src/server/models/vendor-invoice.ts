import mongoose, { Schema, type Document } from "mongoose";

export interface IInvoiceLine {
  product: mongoose.Types.ObjectId;
  quantity: number;
  rate: number;
  gstPercent: number;
}

export interface IVendorInvoice extends Document {
  invoiceNo: string;
  vendor: mongoose.Types.ObjectId;
  purchaseOrder?: mongoose.Types.ObjectId;
  warehouse: mongoose.Types.ObjectId;
  date: Date;
  lines: IInvoiceLine[];
  taxable: number;
  gst: number;
  total: number;
  captureMethod: "manual" | "upload";
  status: "draft" | "posted";
  postedAt?: Date;
  postedBy?: mongoose.Types.ObjectId;
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceLineSchema = new Schema<IInvoiceLine>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    gstPercent: { type: Number, default: 18, min: 0, max: 28 },
  },
  { _id: false }
);

const VendorInvoiceSchema = new Schema<IVendorInvoice>(
  {
    invoiceNo: { type: String, required: true, trim: true },
    vendor: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    purchaseOrder: { type: Schema.Types.ObjectId, ref: "PurchaseOrder" },
    warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    date: { type: Date, required: true },
    lines: { type: [InvoiceLineSchema], validate: (v: unknown[]) => v.length > 0 },
    taxable: { type: Number, required: true },
    gst: { type: Number, required: true },
    total: { type: Number, required: true },
    captureMethod: { type: String, enum: ["manual", "upload"], default: "manual" },
    status: { type: String, enum: ["draft", "posted"], default: "draft" },
    postedAt: { type: Date },
    postedBy: { type: Schema.Types.ObjectId, ref: "User" },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

VendorInvoiceSchema.index({ vendor: 1, invoiceNo: 1 }, { unique: true });
VendorInvoiceSchema.index({ status: 1, date: -1 });

export const VendorInvoice =
  mongoose.models.VendorInvoice || mongoose.model<IVendorInvoice>("VendorInvoice", VendorInvoiceSchema);
