import mongoose, { Schema, type Document } from "mongoose";

/**
 * Flexible material schema — one doc per product variant.
 *
 * Every sheet in the material workbook has different columns
 * (SIZE in mm/inch/kg/liters, ZONE, HP, MODEL, etc.), so we
 * store them in a flat `specs` map alongside a few common fields.
 */
export interface IMaterial extends Document {
  productId: string;         // unique human-readable ID, e.g. "PF-001", "VLV-012"
  name: string;              // product name (PARTICULERS column)
  category: string;          // sheet-level grouping, e.g. "Pipe Fittings", "Valves"
  subCategory?: string;      // within-sheet grouping, e.g. "Jocky Pump", "Main Pump"
  make?: string;             // brand / material type (MS, GI, C&R, Kirloskar …)
  modelNo?: string;           // model number (HCF-101, DB 80-26 …)
  unit: string;              // Nos, Pc, Kg, Pcs, Ltr, Mtr …
  size?: string;             // primary human-readable size string
  specs: Record<string, string | number>;  // flexible key-value (sizeMM, sizeInch, zone, hp, flow, pressure …)
  sheet: string;             // source sheet name in the workbook
  srNo?: number;
  minStock: number;          // reorder threshold — below this, the low-stock alert picks it up
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MaterialSchema = new Schema<IMaterial>(
  {
    productId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    subCategory: { type: String, trim: true },
    make: { type: String, trim: true, default: "" },
    modelNo: { type: String, trim: true, default: "" },
    unit: { type: String, required: true, trim: true, default: "Nos" },
    size: { type: String, trim: true, default: "" },
    specs: { type: Schema.Types.Mixed, default: {} },
    sheet: { type: String, trim: true },
    srNo: { type: Number },
    minStock: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Unique on the combination that identifies a distinct material variant
MaterialSchema.index({ name: 1, size: 1, make: 1, modelNo: 1, unit: 1, category: 1 }, { unique: true });
MaterialSchema.index({ category: 1, subCategory: 1 });
MaterialSchema.index({ sheet: 1 });
MaterialSchema.index({ name: "text" });

// In dev, hot reload re-runs this file; drop the cached model so schema changes apply without a restart.
if (process.env.NODE_ENV !== "production" && mongoose.models.Material) mongoose.deleteModel("Material");

export const Material =
  mongoose.models.Material || mongoose.model<IMaterial>("Material", MaterialSchema);
