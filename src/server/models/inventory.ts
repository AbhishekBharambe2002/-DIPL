import mongoose, { Schema, type Document } from "mongoose";

export interface IInventory extends Document {
  product: mongoose.Types.ObjectId;
  warehouse: mongoose.Types.ObjectId;
  quantity: number;
  reservedQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    quantity: { type: Number, default: 0 },
    reservedQuantity: { type: Number, default: 0 },
  },
  { timestamps: true }
);

InventorySchema.index({ product: 1, warehouse: 1 }, { unique: true });

export const Inventory =
  mongoose.models.Inventory || mongoose.model<IInventory>("Inventory", InventorySchema);
