import mongoose, { Schema, type Document } from "mongoose";

export interface IWarehouse extends Document {
  name: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  manager?: mongoose.Types.ObjectId;
  contactNumber?: string;
  status: "active" | "inactive";
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WarehouseSchema = new Schema<IWarehouse>(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    manager: { type: Schema.Types.ObjectId, ref: "Employee" },
    contactNumber: { type: String, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Warehouse =
  mongoose.models.Warehouse || mongoose.model<IWarehouse>("Warehouse", WarehouseSchema);
