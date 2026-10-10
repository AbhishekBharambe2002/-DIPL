import mongoose, { Schema, type Document } from "mongoose";

export interface IBundleType extends Document {
  code: string;
  name: string;
  description?: string;
  components: { product: mongoose.Types.ObjectId; quantity: number }[];
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BundleTypeSchema = new Schema<IBundleType>(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    components: {
      type: [
        {
          _id: false,
          product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
          quantity: { type: Number, required: true, min: 0 },
        },
      ],
      validate: (v: unknown[]) => v.length > 0,
    },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const BundleType = mongoose.models.BundleType || mongoose.model<IBundleType>("BundleType", BundleTypeSchema);

export interface IBundleComponent {
  product: mongoose.Types.ObjectId;
  quantity: number;
  rate: number;
  consumed: number;
  returned: number;
}

export interface IBundleInstance extends Document {
  number: string;
  bundleType: mongoose.Types.ObjectId;
  units: number;
  warehouse: mongoose.Types.ObjectId;
  project: mongoose.Types.ObjectId;
  site?: mongoose.Types.ObjectId;
  status: "at_site" | "closed";
  components: IBundleComponent[];
  dispatchedAt: Date;
  closedAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BundleInstanceSchema = new Schema<IBundleInstance>(
  {
    number: { type: String, required: true, unique: true },
    bundleType: { type: Schema.Types.ObjectId, ref: "BundleType", required: true },
    units: { type: Number, required: true, min: 1 },
    warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    site: { type: Schema.Types.ObjectId, ref: "Site" },
    status: { type: String, enum: ["at_site", "closed"], default: "at_site" },
    components: [
      {
        _id: false,
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true },
        rate: { type: Number, required: true },
        consumed: { type: Number, default: 0 },
        returned: { type: Number, default: 0 },
      },
    ],
    dispatchedAt: { type: Date, required: true },
    closedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

BundleInstanceSchema.index({ status: 1, dispatchedAt: -1 });

export const BundleInstance =
  mongoose.models.BundleInstance || mongoose.model<IBundleInstance>("BundleInstance", BundleInstanceSchema);
