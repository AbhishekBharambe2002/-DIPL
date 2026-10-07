import mongoose, { Schema, type Document } from "mongoose";

export const COST_TYPES = ["labour", "transport", "overhead", "other"] as const;
export type CostType = (typeof COST_TYPES)[number];

export interface IProjectCost extends Document {
  project: mongoose.Types.ObjectId;
  date: Date;
  type: CostType;
  description: string;
  amount: number;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ProjectCostSchema = new Schema<IProjectCost>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    date: { type: Date, required: true },
    type: { type: String, enum: COST_TYPES, required: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ProjectCostSchema.index({ project: 1, date: -1 });

export const ProjectCost =
  mongoose.models.ProjectCost || mongoose.model<IProjectCost>("ProjectCost", ProjectCostSchema);
