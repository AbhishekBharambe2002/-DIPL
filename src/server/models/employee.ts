import mongoose, { Schema, type Document } from "mongoose";

export interface IEmployee extends Document {
  employeeId: string;
  name: string;
  role: string;
  department?: string;
  phone: string;
  email?: string;
  status: "active" | "inactive";
  user?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    employeeId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    department: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

EmployeeSchema.index({ employeeId: 1 });
EmployeeSchema.index({ name: "text" });

export const Employee =
  mongoose.models.Employee || mongoose.model<IEmployee>("Employee", EmployeeSchema);
