import mongoose from "mongoose";
import "@/server/models/user";
import "@/server/models/role";
import "@/server/models/customer";
import "@/server/models/vendor";
import "@/server/models/employee";
import "@/server/models/project";
import "@/server/models/site";
import "@/server/models/category";
import "@/server/models/product";
import "@/server/models/warehouse";
import "@/server/models/inventory";
import "@/server/models/stock-transaction";
import "@/server/models/task";
import "@/server/models/site-visit";
import "@/server/models/service-request";
import "@/server/models/audit-log";
import "@/server/models/notification";
import "@/server/models/boq-item";
import "@/server/models/project-cost";
import "@/server/models/purchase-order";
import "@/server/models/vendor-invoice";
import "@/server/models/bundle";
import "@/server/models/project-material";
import "@/server/models/material";
import "@/server/models/inventory-log";
import "@/server/models/project-site-log";
import "@/server/models/primary-order";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://abhishekautowhat11_db_user:KaV0OyXkYQRqvsG5@cluster0.j4m8qrf.mongodb.net/";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
