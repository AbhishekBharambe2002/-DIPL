import mongoose from "mongoose";
import { InventoryLog } from "../server/models/inventory-log";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/firesafe";

/**
 * One-time migration: add `quantityToDispatch` to every inventory_logs doc,
 * set to the same value as `quantity` (nothing has been dispatched yet).
 *
 * `quantity` stays as the lifetime total received.
 * `quantityToDispatch` is what's still available — it goes down as stock
 * is dispatched out of inventory, while `quantity` never changes for that.
 */
async function run() {
  await mongoose.connect(MONGODB_URI);

  const res = await InventoryLog.collection.updateMany({}, [{ $set: { quantityToDispatch: "$quantity" } }]);

  console.log(`Matched: ${res.matchedCount}  Updated: ${res.modifiedCount}`);

  const sample = await InventoryLog.find().limit(5).lean();
  console.log("\n── Sample ──");
  for (const s of sample) {
    console.log(`${s.productId.padEnd(10)} quantity: ${String(s.quantity).padStart(5)}  quantityToDispatch: ${String(s.quantityToDispatch).padStart(5)}`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
