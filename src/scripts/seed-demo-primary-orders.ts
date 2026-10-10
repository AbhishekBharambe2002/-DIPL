import mongoose from "mongoose";
import { Material } from "../server/models/material";
import { PrimaryOrder } from "../server/models/primary-order";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/firesafe";

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;

  const vendors = await db.collection("vendors").find({}).toArray();
  const fireguard = vendors.find((v) => v.vendorName.includes("FireGuard"))!;
  const hydro = vendors.find((v) => v.vendorName.includes("Hydro"))!;
  const safeflame = vendors.find((v) => v.vendorName.includes("SafeFlame"))!;

  const mats = await Material.find({ productId: { $in: ["PF-002", "VLV-003", "HW-005", "PF-001", "EXT-001"] } }).lean();
  const byId = (pid: string) => mats.find((m) => m.productId === pid)!;

  function line(pid: string, quantity: number, rate: number) {
    const m = byId(pid);
    return { material: m._id, productId: m.productId, name: m.name, unit: m.unit, quantity, rate, amount: quantity * rate };
  }

  const now = Date.now();
  const days = (n: number) => new Date(now + n * 86_400_000);

  const existing = await PrimaryOrder.countDocuments({});
  let seq = existing + 1;
  const nextNo = () => `PO-${String(seq++).padStart(4, "0")}`;

  const docs = [
    {
      orderNo: nextNo(),
      vendor: fireguard._id,
      lines: [line("PF-002", 200, 180), line("HW-005", 150, 90)],
      expectedDate: days(2), // arriving soon
      destination: "inventory" as const,
      status: "placed" as const,
      createdAt: days(-5),
    },
    {
      orderNo: nextNo(),
      vendor: hydro._id,
      lines: [line("VLV-003", 40, 650)],
      expectedDate: days(-1), // overdue
      destination: "inventory" as const,
      status: "placed" as const,
      createdAt: days(-8),
    },
    {
      orderNo: nextNo(),
      vendor: safeflame._id,
      lines: [line("PF-001", 500, 350), line("EXT-001", 60, 1200)],
      expectedDate: days(6), // comfortably on track
      destination: "inventory" as const,
      status: "placed" as const,
      createdAt: days(-1),
    },
  ];

  for (const d of docs) {
    const totalAmount = d.lines.reduce((s, l) => s + l.amount, 0);
    await PrimaryOrder.create({ ...d, totalAmount });
  }

  console.log(`Seeded ${docs.length} demo incoming orders (destination: inventory, status: placed)`);
  for (const d of docs) {
    console.log(`  ${d.orderNo} — expected ${d.expectedDate.toDateString()}`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
