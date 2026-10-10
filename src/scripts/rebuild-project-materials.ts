import mongoose from "mongoose";
import { rebuildProjectMaterials } from "../server/services/project-materials";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://abhishekautowhat11_db_user:KaV0OyXkYQRqvsG5@cluster0.j4m8qrf.mongodb.net/";

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
