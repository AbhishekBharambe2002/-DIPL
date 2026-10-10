import mongoose from "mongoose";
import { Material } from "../server/models/material";
import { ProjectSiteLog } from "../server/models/project-site-log";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://abhishekautowhat11_db_user:KaV0OyXkYQRqvsG5@cluster0.j4m8qrf.mongodb.net/firesafe";

/**
 * Demo-only: link a handful of already-low-stock materials to real projects
 * (via a small historical ProjectSiteLog dispatch entry) so the low-stock
 * alert's "group by project" view has something to show.
 */
async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;

  const projects = await db.collection("projects").find({}).toArray();
  const abc = projects.find((p) => p.name?.includes("ABC Tower"))!;
  const metro = projects.find((p) => p.name?.includes("Metro Mall"))!;
  const green = projects.find((p) => p.name?.includes("Green Heights"))!;

  const users = await db.collection("users").find({}).toArray();
  const admin = users[0]._id;

  const picks: { productId: string; project: typeof abc; qty: number }[] = [
    { productId: "HW-006", project: abc, qty: 20 }, // C.I HOSE NIPPAL
    { productId: "PF-003", project: metro, qty: 15 }, // Anchor Fastner
    { productId: "PF-029", project: abc, qty: 10 }, // G.I DUMMY PLATE
    { productId: "PF-168", project: green, qty: 5 }, // Washer
    { productId: "HW-014", project: metro, qty: 12 }, // Hitech Clamp
  ];

  const mats = await Material.find({ productId: { $in: picks.map((p) => p.productId) } }).lean();
  const logs = [];
  for (const pick of picks) {
    const m = mats.find((x) => x.productId === pick.productId);
    if (!m) {
      console.log(`Skipped ${pick.productId} — not found`);
      continue;
    }
    logs.push({
      project: pick.project._id,
      material: m._id,
      productId: m.productId,
      type: "dispatch" as const,
      quantity: pick.qty,
      rate: 100,
      value: pick.qty * 100,
      date: new Date(),
      note: "Demo link for low-stock-by-project view",
      createdBy: admin,
    });
  }

  await ProjectSiteLog.insertMany(logs);
  console.log(`Linked ${logs.length} low-stock materials to projects for the demo.`);
  for (const l of logs) {
    const proj = projects.find((p) => p._id.toString() === l.project.toString());
    console.log(`  ${l.productId} → ${proj?.name}`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
