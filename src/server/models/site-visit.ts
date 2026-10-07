import mongoose, { Schema, type Document } from "mongoose";

export interface ISiteVisit extends Document {
  site: mongoose.Types.ObjectId;
  employee: mongoose.Types.ObjectId;
  visitDate: Date;
  checkInTime?: Date;
  checkOutTime?: Date;
  purpose?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  issuesFound?: string;
  workCompleted?: string;
  nextAction?: string;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SiteVisitSchema = new Schema<ISiteVisit>(
  {
    site: { type: Schema.Types.ObjectId, ref: "Site", required: true },
    employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    visitDate: { type: Date, required: true },
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    purpose: { type: String, trim: true },
    location: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    notes: { type: String },
    issuesFound: { type: String },
    workCompleted: { type: String },
    nextAction: { type: String },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

SiteVisitSchema.index({ site: 1, visitDate: -1 });
SiteVisitSchema.index({ employee: 1, visitDate: -1 });

export const SiteVisit =
  mongoose.models.SiteVisit || mongoose.model<ISiteVisit>("SiteVisit", SiteVisitSchema);
