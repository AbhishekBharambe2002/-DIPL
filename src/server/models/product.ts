import mongoose, { Schema, type Document } from "mongoose";

export interface IProduct extends Document {
  sku: string;
  name: string;
  category: mongoose.Types.ObjectId;
  brand?: string;
  modelNumber?: string;
  description?: string;
  unit: string;
  hsnSac?: string;
  gstPercent?: number;
  purchasePrice?: number;
  sellingPrice?: number;
  minimumStock: number;
  maximumStock?: number;
  reorderLevel?: number;
  serialTracking: boolean;
  batchTracking: boolean;
  warrantyPeriod?: number;
  isActive: boolean;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    sku: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    brand: { type: String, trim: true },
    modelNumber: { type: String, trim: true },
    description: { type: String },
    unit: { type: String, required: true, trim: true, default: "Nos" },
    hsnSac: { type: String, trim: true },
    gstPercent: { type: Number },
    purchasePrice: { type: Number },
    sellingPrice: { type: Number },
    minimumStock: { type: Number, default: 0 },
    maximumStock: { type: Number },
    reorderLevel: { type: Number },
    serialTracking: { type: Boolean, default: false },
    batchTracking: { type: Boolean, default: false },
    warrantyPeriod: { type: Number },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ProductSchema.index({ category: 1 });
ProductSchema.index({ name: "text", sku: "text" });

export const Product =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);
