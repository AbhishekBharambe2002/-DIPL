import mongoose, { Schema, type Document } from "mongoose";

// One record per project + product: the planned (expected) quantity, plus running totals from every site movement.
export interface IProjectMaterial extends Document {
  project: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  planned: number;
  allocated: number;
  consumed: number;
  returned: number;
  balance: number;
  firstIssuedAt?: Date;
  lastMovementAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectMaterialSchema = new Schema<IProjectMaterial>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    planned: { type: Number, default: 0, min: 0 },
    allocated: { type: Number, default: 0 },
    consumed: { type: Number, default: 0 },
    returned: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    firstIssuedAt: { type: Date },
    lastMovementAt: { type: Date },
  },
  { timestamps: true }
);

ProjectMaterialSchema.index({ project: 1, product: 1 }, { unique: true });
ProjectMaterialSchema.index({ product: 1 });

// In dev, hot reload re-runs this file; drop the cached model so schema changes apply without a restart.
if (process.env.NODE_ENV !== "production" && mongoose.models.ProjectMaterial) mongoose.deleteModel("ProjectMaterial");

export const ProjectMaterial =
  mongoose.models.ProjectMaterial || mongoose.model<IProjectMaterial>("ProjectMaterial", ProjectMaterialSchema);
