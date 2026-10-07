import mongoose, { Schema, type Document } from "mongoose";

export interface ICategory extends Document {
  name: string;
  parent?: mongoose.Types.ObjectId;
  description?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    parent: { type: Schema.Types.ObjectId, ref: "Category" },
    description: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CategorySchema.index({ parent: 1 });

export const Category =
  mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);
