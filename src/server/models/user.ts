import mongoose, { Schema, type Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  username?: string;
  email: string;
  password: string;
  role: mongoose.Types.ObjectId;
  phone?: string;
  department?: string;
  isActive: boolean;
  isDeleted: boolean;
  lastLogin?: Date;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: Schema.Types.ObjectId, ref: "Role", required: true },
    phone: { type: String, trim: true },
    department: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    lastLogin: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1 });
UserSchema.index({ isDeleted: 1, isActive: 1 });

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
