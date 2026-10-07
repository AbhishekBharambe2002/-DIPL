import mongoose, { Schema, type Document } from "mongoose";
import type { StockTransactionType } from "@/types";

export interface IStockTransaction extends Document {
  product: mongoose.Types.ObjectId;
  warehouse: mongoose.Types.ObjectId;
  type: StockTransactionType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  project?: mongoose.Types.ObjectId;
  site?: mongoose.Types.ObjectId;
  referenceType?: string;
  referenceId?: mongoose.Types.ObjectId;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const StockTransactionSchema = new Schema<IStockTransaction>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    type: {
      type: String,
      enum: [
        "purchase", "stock_in", "stock_out", "site_issue", "site_return",
        "transfer", "adjustment", "damaged", "lost", "consumed",
      ],
      required: true,
    },
    quantity: { type: Number, required: true },
    previousQuantity: { type: Number, required: true },
    newQuantity: { type: Number, required: true },
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    site: { type: Schema.Types.ObjectId, ref: "Site" },
    referenceType: { type: String },
    referenceId: { type: Schema.Types.ObjectId },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

StockTransactionSchema.index({ product: 1, warehouse: 1, createdAt: -1 });
StockTransactionSchema.index({ createdAt: -1 });

export const StockTransaction =
  mongoose.models.StockTransaction ||
  mongoose.model<IStockTransaction>("StockTransaction", StockTransactionSchema);
