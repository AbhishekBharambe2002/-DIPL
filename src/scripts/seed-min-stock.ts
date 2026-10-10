import mongoose from "mongoose";
import { Material } from "../server/models/material";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/firesafe";

/**
 * Reorder threshold per category — below this, a material shows up in the
 * low-stock alert. Rough numbers: cheap small parts need a bigger buffer,
 * expensive equipment needs very little.
 */
const MIN_STOCK: Record<string, number> = {
  "Pipe Fittings": 40,
  "Hardware & Supports": 60,
  "Fire Alarm Panel": 5,
  "4 Way & Hydrant": 8,
  Valves: 15,
  Extinguisher: 15,
  "Hose Reel & Box": 5,
  "Control Panel & Pump": 3,
  NewAge: 10,
  "PVC Material": 30,
  Paint: 10,
  Cable: 50,
};

async function run() {
  await mongoose.connect(MONGODB_URI);

  const materials = await Material.find({ isActive: true }).lean();
  const ops = materials.map((m) => ({
    updateOne: {
      filter: { _id: m._id },
      update: { $set: { minStock: MIN_STOCK[m.category] ?? 15 } },
    },
  }));

  const res = await Material.bulkWrite(ops);
  console.log(`Set minStock on ${res.modifiedCount} materials`);

  // Show how many are currently below their threshold, joining against inventory_logs.
  const short = await Material.aggregate([
    { $match: { isActive: true } },
    { $lookup: { from: "inventorylogs", localField: "_id", foreignField: "material", as: "log" } },
    { $unwind: { path: "$log", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        name: 1,
        productId: 1,
        minStock: 1,
        qty: { $ifNull: ["$log.quantityToDispatch", 0] },
      },
    },
    { $match: { $expr: { $lt: ["$qty", "$minStock"] } } },
  ]);

  console.log(`\n${short.length} materials currently below their minimum stock:`);
  for (const s of short.slice(0, 15)) {
    console.log(`  ${s.productId.padEnd(8)} ${s.name.substring(0, 35).padEnd(37)} qty: ${String(s.qty).padStart(4)}  min: ${s.minStock}`);
  }
  if (short.length > 15) console.log(`  … and ${short.length - 15} more`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
