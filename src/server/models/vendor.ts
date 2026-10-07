import mongoose, { Schema, type Document } from "mongoose";

export interface IVendor extends Document {
  vendorName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gst?: string;
  productsSupplied?: string[];
  paymentTerms?: string;
  notes?: string;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema = new Schema<IVendor>(
  {
    vendorName: { type: String, required: true, trim: true },
    contactPerson: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    gst: { type: String, trim: true },
    productsSupplied: [{ type: String }],
    paymentTerms: { type: String },
    notes: { type: String },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

VendorSchema.index({ vendorName: "text", contactPerson: "text" });

export const Vendor =
  mongoose.models.Vendor || mongoose.model<IVendor>("Vendor", VendorSchema);
