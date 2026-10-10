import mongoose from "mongoose";
import { Material } from "../server/models/material";
import { InventoryLog } from "../server/models/inventory-log";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/firesafe";

/**
 * Category → prefix map for generating unique product IDs.
 */
const PREFIX: Record<string, string> = {
  "Pipe Fittings": "PF",
  "Hardware & Supports": "HW",
  "Fire Alarm Panel": "FAP",
  "4 Way & Hydrant": "HYD",
  Valves: "VLV",
  Extinguisher: "EXT",
  "Hose Reel & Box": "HRB",
  "Control Panel & Pump": "CPP",
  NewAge: "NA",
  "PVC Material": "PVC",
  Paint: "PNT",
  Cable: "CBL",
};

/** Random int between min and max (inclusive) */
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Random date in the last 6 months */
function randomDate() {
  const now = Date.now();
  const sixMonthsAgo = now - 180 * 24 * 60 * 60 * 1000;
  return new Date(sixMonthsAgo + Math.random() * (now - sixMonthsAgo));
}

/** Mock purchase prices by category */
const PRICE_RANGE: Record<string, [number, number]> = {
  "Pipe Fittings": [25, 1200],
  "Hardware & Supports": [5, 350],
  "Fire Alarm Panel": [800, 18000],
  "4 Way & Hydrant": [2500, 12000],
  Valves: [400, 8500],
  Extinguisher: [900, 4500],
  "Hose Reel & Box": [1500, 8000],
  "Control Panel & Pump": [5000, 95000],
  NewAge: [200, 6000],
  "PVC Material": [15, 450],
  Paint: [250, 3500],
  Cable: [18, 120],
};

async function run() {
  await mongoose.connect(MONGODB_URI);

  // ── Step 1: Assign unique productId to every material ──
  const materials = await Material.find({ isActive: true }).sort({ category: 1, name: 1, size: 1 }).lean();

  const counters: Record<string, number> = {};
  const bulkOps = materials.map((m) => {
    const prefix = PREFIX[m.category] || "MAT";
    counters[prefix] = (counters[prefix] || 0) + 1;
    const productId = `${prefix}-${String(counters[prefix]).padStart(3, "0")}`;
    return {
      updateOne: {
        filter: { _id: m._id },
        update: { $set: { productId } },
      },
    };
  });

  const idRes = await Material.bulkWrite(bulkOps);
  console.log(`Assigned productId to ${idRes.modifiedCount} materials`);

  // ── Step 2: Create inventory_logs with mock data ──
  await InventoryLog.collection.drop().catch(() => {});
  console.log("Dropped old inventory_logs");

  const updatedMaterials = await Material.find({ isActive: true }).lean();

  const logs = updatedMaterials.map((m) => {
    const range = PRICE_RANGE[m.category] || [50, 500];
    const price = rand(range[0], range[1]);
    const qty = rand(5, 200);
    return {
      material: m._id,
      productId: m.productId,
      sheet: m.sheet,
      quantity: qty,
      purchasePrice: price,
      totalValue: qty * price,
      addedAt: randomDate(),
    };
  });

  await InventoryLog.insertMany(logs);
  console.log(`Inserted ${logs.length} inventory logs`);

  // Print a sample
  console.log("\n── Sample ──");
  const samples = await InventoryLog.find().limit(10).populate("material", "name size category").lean();
  for (const s of samples) {
    const mat = s.material as unknown as { name: string; size: string; category: string };
    console.log(
      `${s.productId.padEnd(8)} | ${mat.name.substring(0, 35).padEnd(35)} | ${(mat.size || "").padEnd(14)} | qty: ${String(s.quantity).padStart(4)} | ₹${s.purchasePrice} | sheet: ${s.sheet}`
    );
  }

  console.log(`\nTotal materials: ${updatedMaterials.length}`);
  console.log(`Total inventory logs: ${await InventoryLog.countDocuments()}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
