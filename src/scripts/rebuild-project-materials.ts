import mongoose from "mongoose";
import { rebuildProjectMaterials } from "../server/services/project-materials";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/firesafe";

async function main() {
  await mongoose.connect(MONGODB_URI);
  const n = await rebuildProjectMaterials();
  console.log(`Rebuilt ${n} project material records from the stock ledger.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Rebuild failed:", err);
  process.exit(1);
});
