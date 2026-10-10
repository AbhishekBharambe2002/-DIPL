import mongoose, { Schema, type Document } from "mongoose";

/**
 * Inventory log — one entry per material showing quantity, price,
 * sheet reference and the date it was added/updated.
 */
export interface IInventoryLog extends Document {
  material: mongoose.Types.ObjectId;  // ref → Material
  productId: string;                  // copied from Material for quick lookup
  sheet: string;                      // sheet name from the workbook
  quantity: number;                   // total ever received — never decreases
  quantityToDispatch: number;         // what's still available to send out — starts equal to quantity, drops as it's dispatched
  purchasePrice: number;              // per-unit price
  totalValue: number;                 // quantity × purchasePrice
  addedAt: Date;                      // date the entry was recorded
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryLogSchema = new Schema<IInventoryLog>(
  {
    material: { type: Schema.Types.ObjectId, ref: "Material", required: true },
    productId: { type: String, required: true, trim: true },
    sheet: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, default: 0 },
    quantityToDispatch: { type: Number, required: true, default: 0 },
    purchasePrice: { type: Number, required: true, default: 0 },
    totalValue: { type: Number, default: 0 },
    addedAt: { type: Date, default: Date.now },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

InventoryLogSchema.index({ material: 1 });
InventoryLogSchema.index({ productId: 1 });
InventoryLogSchema.index({ sheet: 1 });
InventoryLogSchema.index({ addedAt: -1 });

// In dev, hot reload re-runs this file; drop the cached model so schema changes apply without a restart.
if (process.env.NODE_ENV !== "production" && mongoose.models.InventoryLog) mongoose.deleteModel("InventoryLog");

export const InventoryLog =
  mongoose.models.InventoryLog || mongoose.model<IInventoryLog>("InventoryLog", InventoryLogSchema);
