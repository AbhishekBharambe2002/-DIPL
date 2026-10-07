import mongoose, { Schema, type Document } from "mongoose";
import type { ServiceStatus, Priority } from "@/types";

export interface IServiceRequest extends Document {
  serviceId: string;
  customer: mongoose.Types.ObjectId;
  site?: mongoose.Types.ObjectId;
  equipment?: string;
  complaint: string;
  priority: Priority;
  assignedTo?: mongoose.Types.ObjectId;
  scheduledDate?: Date;
  status: ServiceStatus;
  resolution?: string;
  notes?: string;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceRequestSchema = new Schema<IServiceRequest>(
  {
    serviceId: { type: String, required: true, unique: true, trim: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    site: { type: Schema.Types.ObjectId, ref: "Site" },
    equipment: { type: String, trim: true },
    complaint: { type: String, required: true },
    priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "Employee" },
    scheduledDate: { type: Date },
    status: {
      type: String,
      enum: ["open", "assigned", "scheduled", "in_progress", "waiting", "completed", "cancelled"],
      default: "open",
    },
    resolution: { type: String },
    notes: { type: String },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ServiceRequestSchema.index({ status: 1 });
ServiceRequestSchema.index({ customer: 1 });
ServiceRequestSchema.index({ site: 1 });

export const ServiceRequest =
  mongoose.models.ServiceRequest ||
  mongoose.model<IServiceRequest>("ServiceRequest", ServiceRequestSchema);
