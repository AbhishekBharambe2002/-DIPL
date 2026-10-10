import mongoose, { Schema, type Document } from "mongoose";

/**
 * Project-site log — every material movement in/out of a project site.
 *
 * One entry per event. The running totals (allocated, consumed, balance)
 * for a material at a project are computed by aggregating this collection —
 * no separate summary doc is needed.
 *
 * Types:
 *   dispatch    → material leaves warehouse for the project site
 *   consumed    → material is installed / used at site
 *   returned    → material comes back from site to warehouse
 */
export interface IProjectSiteLog extends Document {
  project: mongoose.Types.ObjectId;
  material: mongoose.Types.ObjectId;       // ref → Material (the 393 Excel items)
  productId: string;                       // copied from Material for quick lookup
  type: "dispatch" | "consumed" | "returned";
  quantity: number;                        // always positive; type gives direction
  rate: number;                            // per-unit purchase price at the time
  value: number;                           // quantity × rate
  date: Date;                              // when it happened
  // For "dispatch" entries only — stock leaves the warehouse immediately, but only
  // counts toward the project's Allocated total once delivery at site is confirmed.
  deliveryStatus: "in_transit" | "delivered";
  deliveredAt?: Date;
  deliveredBy?: mongoose.Types.ObjectId;
  note?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSiteLogSchema = new Schema<IProjectSiteLog>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    material: { type: Schema.Types.ObjectId, ref: "Material", required: true },
    productId: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["dispatch", "consumed", "returned"],
      required: true,
    },
    quantity: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, default: 0 },
    value: { type: Number, default: 0 },
    date: { type: Date, required: true, default: Date.now },
    deliveryStatus: { type: String, enum: ["in_transit", "delivered"], default: "delivered" },
    deliveredAt: { type: Date },
    deliveredBy: { type: Schema.Types.ObjectId, ref: "User" },
    note: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ProjectSiteLogSchema.index({ project: 1, material: 1, date: -1 });
ProjectSiteLogSchema.index({ material: 1 });
ProjectSiteLogSchema.index({ productId: 1 });
ProjectSiteLogSchema.index({ date: -1 });
ProjectSiteLogSchema.index({ project: 1, date: -1 });
ProjectSiteLogSchema.index({ type: 1, deliveryStatus: 1 });

// In dev, hot reload re-runs this file; drop the cached model so schema changes apply without a restart.
if (process.env.NODE_ENV !== "production" && mongoose.models.ProjectSiteLog) mongoose.deleteModel("ProjectSiteLog");

export const ProjectSiteLog =
  mongoose.models.ProjectSiteLog ||
  mongoose.model<IProjectSiteLog>("ProjectSiteLog", ProjectSiteLogSchema);
