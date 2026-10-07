import mongoose, { Schema, type Document } from "mongoose";
import type { ProjectStatus, Priority } from "@/types";

export interface IProject extends Document {
  projectId: string;
  name: string;
  customer: mongoose.Types.ObjectId;
  projectType?: string;
  description?: string;
  startDate?: Date;
  expectedCompletionDate?: Date;
  actualCompletionDate?: Date;
  projectManager?: mongoose.Types.ObjectId;
  projectEngineer?: mongoose.Types.ObjectId;
  assignedTeam: mongoose.Types.ObjectId[];
  status: ProjectStatus;
  priority: Priority;
  budget?: number;
  location?: string;
  progress: number;
  notes?: string;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    projectId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    projectType: { type: String, trim: true },
    description: { type: String },
    startDate: { type: Date },
    expectedCompletionDate: { type: Date },
    actualCompletionDate: { type: Date },
    projectManager: { type: Schema.Types.ObjectId, ref: "Employee" },
    projectEngineer: { type: Schema.Types.ObjectId, ref: "Employee" },
    assignedTeam: [{ type: Schema.Types.ObjectId, ref: "Employee" }],
    status: {
      type: String,
      enum: ["draft", "planning", "approved", "active", "on_hold", "delayed", "completed", "cancelled"],
      default: "draft",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    budget: { type: Number },
    location: { type: String, trim: true },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    notes: { type: String },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ProjectSchema.index({ status: 1 });
ProjectSchema.index({ customer: 1 });
ProjectSchema.index({ isDeleted: 1, status: 1 });
ProjectSchema.index({ name: "text", projectId: "text" });

export const Project =
  mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);
