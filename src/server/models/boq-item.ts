import mongoose, { Schema, type Document } from "mongoose";

export interface IBoqItem extends Document {
  project: mongoose.Types.ObjectId;
  itemNo: string;
  section?: string;
  description: string;
  unit: string;
  quantity: number;
  supplyRate: number;
  installRate: number;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BoqItemSchema = new Schema<IBoqItem>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    itemNo: { type: String, required: true, trim: true },
    section: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    supplyRate: { type: Number, required: true, min: 0 },
    installRate: { type: Number, default: 0, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

BoqItemSchema.index({ project: 1, itemNo: 1 });

export const BoqItem = mongoose.models.BoqItem || mongoose.model<IBoqItem>("BoqItem", BoqItemSchema);
