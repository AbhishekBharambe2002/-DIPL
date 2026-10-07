import mongoose, { Schema, type Document } from "mongoose";
import type { SiteStatus } from "@/types";

export interface ISite extends Document {
  siteId: string;
  name: string;
  project: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  contactPerson?: string;
  contactNumber?: string;
  siteEngineer?: mongoose.Types.ObjectId;
  supervisor?: mongoose.Types.ObjectId;
  status: SiteStatus;
  buildingType?: string;
  numberOfFloors?: number;
  constructionStatus?: string;
  notes?: string;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SiteSchema = new Schema<ISite>(
  {
    siteId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    contactPerson: { type: String, trim: true },
    contactNumber: { type: String, trim: true },
    siteEngineer: { type: Schema.Types.ObjectId, ref: "Employee" },
    supervisor: { type: Schema.Types.ObjectId, ref: "Employee" },
    status: {
      type: String,
      enum: [
        "not_started", "survey", "planning", "installation", "testing",
        "commissioning", "completed", "maintenance", "on_hold",
      ],
      default: "not_started",
    },
    buildingType: { type: String, trim: true },
    numberOfFloors: { type: Number },
    constructionStatus: { type: String, trim: true },
    notes: { type: String },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

SiteSchema.index({ project: 1 });
SiteSchema.index({ status: 1 });
SiteSchema.index({ isDeleted: 1, status: 1 });

export const Site = mongoose.models.Site || mongoose.model<ISite>("Site", SiteSchema);
