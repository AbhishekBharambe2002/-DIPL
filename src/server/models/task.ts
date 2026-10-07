import mongoose, { Schema, type Document } from "mongoose";
import type { TaskStatus, Priority } from "@/types";

export interface ITask extends Document {
  title: string;
  description?: string;
  project?: mongoose.Types.ObjectId;
  site?: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  priority: Priority;
  dueDate?: Date;
  status: TaskStatus;
  progress: number;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    site: { type: Schema.Types.ObjectId, ref: "Site" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "Employee" },
    priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    dueDate: { type: Date },
    status: { type: String, enum: ["todo", "in_progress", "blocked", "completed"], default: "todo" },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

TaskSchema.index({ project: 1, status: 1 });
TaskSchema.index({ assignedTo: 1, status: 1 });
TaskSchema.index({ dueDate: 1 });

export const Task = mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);
