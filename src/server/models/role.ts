import mongoose, { Schema, type Document } from "mongoose";
import type { Permission } from "@/config/permissions";

export interface IRole extends Document {
  name: string;
  code: string;
  description?: string;
  permissions: Permission[];
  isSystem: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, trim: true },
    permissions: [{ type: String }],
    isSystem: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);


export const Role = mongoose.models.Role || mongoose.model<IRole>("Role", RoleSchema);
