import mongoose from "mongoose";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Material } from "../server/models/material";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/firesafe";

async function run() {
  const file = process.argv[2] ?? path.join(__dirname, "../data/materials-all.json");
  const rows = JSON.parse(readFileSync(file, "utf-8"));

  await mongoose.connect(MONGODB_URI);

  // Fresh import: drop old data and re-create indexes for the new schema
  if (process.argv.includes("--fresh")) {
    await Material.collection.drop().catch(() => {});
    console.log("Dropped old materials collection");
  }

  await Material.syncIndexes();

  const ops = rows.map((r: Record<string, unknown>) => ({
    updateOne: {
      filter: {
        name: r.name,
        size: r.size || "",
        make: r.make || "",
        modelNo: r.modelNo || "",
        unit: r.unit || "Nos",
        category: r.category,
      },
      update: { $set: { ...r, isActive: true } },
      upsert: true,
    },
  }));

  const res = await Material.bulkWrite(ops);
  console.log(`Rows: ${rows.length}  inserted: ${res.upsertedCount}  updated: ${res.modifiedCount}`);
  console.log(`Total in materials: ${await Material.countDocuments()}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
