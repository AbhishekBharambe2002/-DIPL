import mongoose from "mongoose";
import { Material } from "../server/models/material";
import { ProjectSiteLog } from "../server/models/project-site-log";
import { InventoryLog } from "../server/models/inventory-log";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://abhishekautowhat11_db_user:KaV0OyXkYQRqvsG5@cluster0.j4m8qrf.mongodb.net/";

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function d(iso: string) {
  return new Date(iso);
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;

  // Get project IDs
  const projects = await db.collection("projects").find({}).toArray();
  const abc = projects.find((p) => p.name?.includes("ABC Tower"))!;
  const green = projects.find((p) => p.name?.includes("Green Heights"))!;
  const metro = projects.find((p) => p.name?.includes("Metro Mall"))!;
  const city = projects.find((p) => p.name?.includes("City Center"))!;
  const royal = projects.find((p) => p.name?.includes("Royal"))!;
  const sunrise = projects.find((p) => p.name?.includes("Sunrise"))!;

  // Get user
  const users = await db.collection("users").find({}).toArray();
  const admin = users[0]._id;

  // Get materials — pick from the 393 for demo data
  const allMats = await Material.find({ isActive: true }).lean();
  const byId = (pid: string) => allMats.find((m) => m.productId === pid);

  // Helper
  function log(
    projectId: mongoose.Types.ObjectId,
    mat: { _id: mongoose.Types.ObjectId; productId: string },
    type: "dispatch" | "consumed" | "returned",
    qty: number,
    rate: number,
    date: string,
    note?: string
  ) {
    return {
      project: projectId,
      material: mat._id,
      productId: mat.productId,
      type,
      quantity: qty,
      rate,
      value: qty * rate,
      date: d(date),
      note,
      createdBy: admin,
    };
  }

  // ── Drop old logs ──
  await ProjectSiteLog.collection.drop().catch(() => {});
  console.log("Dropped old project-site-logs");

  const logs: ReturnType<typeof log>[] = [];

  // ── ABC Tower — matches portal reference data exactly ──
  // Pick some materials for ABC Tower project
  const pf001 = byId("PF-001")!; // pipe fitting
  const pf050 = byId("PF-050")!; // another fitting
  const vlv001 = byId("VLV-001")!; // valve
  const vlv010 = byId("VLV-010")!; // another valve
  const fap001 = byId("FAP-001")!; // fire alarm panel
  const fap005 = byId("FAP-005")!; // smoke detector etc
  const ext001 = byId("EXT-001")!; // extinguisher
  const cpp001 = byId("CPP-001")!; // pump
  const hw001 = byId("HW-001")!; // hardware
  const pvc001 = byId("PVC-001")!; // PVC pipe

  // Dispatch to ABC Tower
  logs.push(log(abc._id, pf001, "dispatch", 1000, 350, "2026-06-14", "MS pipe for hydrant risers"));
  logs.push(log(abc._id, vlv001, "dispatch", 45, 3500, "2026-06-19", "Hydrant valves"));
  logs.push(log(abc._id, pvc001, "dispatch", 1400, 180, "2026-06-09", "Sprinkler CPVC pipes"));
  logs.push(log(abc._id, fap005, "dispatch", 350, 800, "2026-06-24", "Smoke detectors"));
  logs.push(log(abc._id, ext001, "dispatch", 120, 1200, "2026-06-29", "Fire extinguishers"));
  logs.push(log(abc._id, hw001, "dispatch", 150, 600, "2026-07-04", "Flexible hose droppers"));
  logs.push(log(abc._id, fap001, "dispatch", 2, 15000, "2026-07-09", "Fire alarm panels"));
  logs.push(log(abc._id, cpp001, "dispatch", 1, 85000, "2026-07-14", "Fire pump"));

  // Consumed at ABC Tower
  logs.push(log(abc._id, pf001, "consumed", 900, 350, "2026-06-23", "Hydrant riser installation floors 1-10"));
  logs.push(log(abc._id, pvc001, "consumed", 1250, 180, "2026-06-18", "Sprinkler main installation"));
  logs.push(log(abc._id, fap005, "consumed", 320, 800, "2026-07-03", "Detector installation all floors"));
  logs.push(log(abc._id, vlv001, "consumed", 40, 3500, "2026-06-28", "Valve installation"));
  logs.push(log(abc._id, ext001, "consumed", 110, 1200, "2026-07-08", "Extinguisher mounting all floors"));
  logs.push(log(abc._id, hw001, "consumed", 130, 600, "2026-07-13", "Emergency light installation"));
  logs.push(log(abc._id, fap001, "consumed", 2, 15000, "2026-07-18", "Panel wiring"));
  logs.push(log(abc._id, cpp001, "consumed", 1, 85000, "2026-07-23", "Pump room installation"));

  // Return from ABC Tower
  logs.push(log(abc._id, pf001, "returned", 20, 350, "2026-06-28", "Excess pipe returned"));

  // ── Green Heights — smaller project ──
  logs.push(log(green._id, pf001, "dispatch", 150, 350, "2026-07-10"));
  logs.push(log(green._id, pvc001, "dispatch", 300, 180, "2026-07-12"));
  logs.push(log(green._id, vlv010, "dispatch", 20, 4200, "2026-07-15"));
  logs.push(log(green._id, fap005, "dispatch", 100, 800, "2026-07-18"));
  logs.push(log(green._id, pf001, "consumed", 80, 350, "2026-07-25"));
  logs.push(log(green._id, pvc001, "consumed", 100, 180, "2026-07-28"));

  // ── Metro Mall ──
  logs.push(log(metro._id, pf001, "dispatch", 500, 350, "2026-06-01"));
  logs.push(log(metro._id, pvc001, "dispatch", 900, 180, "2026-06-05"));
  logs.push(log(metro._id, vlv001, "dispatch", 30, 3500, "2026-06-10"));
  logs.push(log(metro._id, fap005, "dispatch", 200, 800, "2026-06-15"));
  logs.push(log(metro._id, ext001, "dispatch", 80, 1200, "2026-06-20"));
  logs.push(log(metro._id, pf001, "consumed", 450, 350, "2026-07-01"));
  logs.push(log(metro._id, pvc001, "consumed", 820, 180, "2026-07-05"));
  logs.push(log(metro._id, vlv001, "consumed", 28, 3500, "2026-07-10"));
  logs.push(log(metro._id, fap005, "consumed", 180, 800, "2026-07-15"));
  logs.push(log(metro._id, ext001, "consumed", 75, 1200, "2026-07-20"));
  logs.push(log(metro._id, pvc001, "returned", 30, 180, "2026-07-22"));

  // ── City Center (completed) ──
  logs.push(log(city._id, pf001, "dispatch", 900, 350, "2026-03-01"));
  logs.push(log(city._id, pvc001, "dispatch", 600, 180, "2026-03-05"));
  logs.push(log(city._id, fap005, "dispatch", 300, 800, "2026-03-10"));
  logs.push(log(city._id, fap001, "dispatch", 3, 15000, "2026-03-15"));
  logs.push(log(city._id, pf001, "consumed", 880, 350, "2026-04-15"));
  logs.push(log(city._id, pvc001, "consumed", 580, 180, "2026-04-20"));
  logs.push(log(city._id, fap005, "consumed", 300, 800, "2026-04-25"));
  logs.push(log(city._id, fap001, "consumed", 3, 15000, "2026-05-01"));
  logs.push(log(city._id, pf001, "returned", 20, 350, "2026-05-05"));

  // ── Royal Industries ──
  logs.push(log(royal._id, pf050, "dispatch", 200, 250, "2026-08-01"));
  logs.push(log(royal._id, vlv010, "dispatch", 15, 4200, "2026-08-05"));
  logs.push(log(royal._id, cpp001, "dispatch", 2, 85000, "2026-08-10"));
  logs.push(log(royal._id, pf050, "consumed", 120, 250, "2026-08-20"));

  // ── Sunrise Hospital AMC ──
  logs.push(log(sunrise._id, ext001, "dispatch", 50, 1200, "2026-07-01", "AMC replacement stock"));
  logs.push(log(sunrise._id, fap005, "dispatch", 25, 800, "2026-07-05", "Detector replacement"));
  logs.push(log(sunrise._id, ext001, "consumed", 30, 1200, "2026-08-15", "Extinguisher swap-out"));
  logs.push(log(sunrise._id, fap005, "consumed", 20, 800, "2026-08-20", "Detector replacement"));

  await ProjectSiteLog.insertMany(logs);
  console.log(`Inserted ${logs.length} project-site-logs`);

  // ── Also update inventory_logs with purchase prices that make sense ──
  // Update rates on the materials used above
  const matUpdates = [
    { pid: pf001.productId, price: 350 },
    { pid: pf050.productId, price: 250 },
    { pid: vlv001.productId, price: 3500 },
    { pid: vlv010.productId, price: 4200 },
    { pid: fap001.productId, price: 15000 },
    { pid: fap005.productId, price: 800 },
    { pid: ext001.productId, price: 1200 },
    { pid: cpp001.productId, price: 85000 },
    { pid: hw001.productId, price: 600 },
    { pid: pvc001.productId, price: 180 },
  ];

  for (const { pid, price } of matUpdates) {
    await InventoryLog.updateOne({ productId: pid }, { $set: { purchasePrice: price, totalValue: price } });
  }
  console.log("Updated inventory_log prices for demo materials");

  // Print summary per project
  const summary = await ProjectSiteLog.aggregate([
    { $group: { _id: { project: "$project", type: "$type" }, total: { $sum: "$quantity" }, value: { $sum: "$value" } } },
  ]);
  console.log("\n── Summary ──");
  for (const p of projects) {
    const dispatched = summary.find((s) => s._id.project?.toString() === p._id.toString() && s._id.type === "dispatch");
    const consumed = summary.find((s) => s._id.project?.toString() === p._id.toString() && s._id.type === "consumed");
    const returned = summary.find((s) => s._id.project?.toString() === p._id.toString() && s._id.type === "returned");
    if (!dispatched && !consumed) continue;
    console.log(
      `${p.name?.substring(0, 25).padEnd(27)} dispatch: ${String(dispatched?.total ?? 0).padStart(5)} (₹${dispatched?.value ?? 0})  consumed: ${String(consumed?.total ?? 0).padStart(5)} (₹${consumed?.value ?? 0})  returned: ${String(returned?.total ?? 0).padStart(4)} (₹${returned?.value ?? 0})`
    );
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
