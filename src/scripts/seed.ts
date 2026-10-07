import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/firesafe";

const ALL_PERMISSIONS = [
  "dashboard.view", "project.view", "project.create", "project.edit", "project.delete",
  "project.manage_team", "site.view", "site.create", "site.edit", "site.delete", "site.visit",
  "task.view", "task.create", "task.edit", "task.assign", "task.delete",
  "inventory.view", "inventory.create", "inventory.edit", "inventory.issue", "inventory.receive",
  "inventory.transfer", "inventory.adjust", "product.view", "product.create", "product.edit",
  "product.delete", "warehouse.view", "warehouse.create", "warehouse.edit",
  "purchase_request.view", "purchase_request.create", "purchase_request.approve",
  "purchase_order.view", "purchase_order.create", "purchase_order.approve",
  "goods_receipt.view", "goods_receipt.create",
  "service.view", "service.create", "service.assign", "service.complete",
  "customer.view", "customer.create", "customer.edit",
  "vendor.view", "vendor.create", "vendor.edit",
  "employee.view", "employee.create", "employee.edit",
  "document.view", "document.upload", "document.delete",
  "report.view", "report.export",
  "user.view", "user.create", "user.edit", "user.delete",
  "role.view", "role.create", "role.edit",
  "audit.view", "settings.view", "settings.edit", "notification.view",
];

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected. Seeding data...\n");

  const db = mongoose.connection.db!;

  const collections = [
    "roles", "users", "customers", "vendors", "employees",
    "categories", "products", "warehouses", "inventories",
    "projects", "sites", "tasks", "stocktransactions",
    "servicerequests", "sitevisits", "auditlogs", "boqitems", "projectcosts",
  ];
  for (const name of collections) {
    try { await db.collection(name).drop(); } catch { /* may not exist */ }
  }

  // ─── Roles ─────────────────────────────────────────────
  console.log("Creating roles...");
  const rolesResult = await db.collection("roles").insertMany([
    { name: "Super Admin", code: "SUPER_ADMIN", description: "Full system access", permissions: ALL_PERMISSIONS, isSystem: true, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { name: "Admin", code: "ADMIN", description: "Full operational access", permissions: ALL_PERMISSIONS.filter(p => p !== "settings.edit"), isSystem: true, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { name: "Project Manager", code: "PROJECT_MANAGER", description: "Manage projects and sites", permissions: ["dashboard.view","project.view","project.create","project.edit","project.manage_team","site.view","site.create","site.edit","site.visit","task.view","task.create","task.edit","task.assign","inventory.view","product.view","warehouse.view","purchase_request.view","purchase_request.create","customer.view","customer.create","customer.edit","employee.view","document.view","document.upload","report.view","report.export","notification.view"], isSystem: true, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { name: "Site Engineer", code: "SITE_ENGINEER", description: "Manage assigned sites", permissions: ["dashboard.view","project.view","site.view","site.edit","site.visit","task.view","task.create","task.edit","inventory.view","product.view","purchase_request.view","purchase_request.create","customer.view","employee.view","document.view","document.upload","report.view","notification.view"], isSystem: true, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { name: "Inventory Manager", code: "INVENTORY_MANAGER", description: "Full inventory access", permissions: ["dashboard.view","inventory.view","inventory.create","inventory.edit","inventory.issue","inventory.receive","inventory.transfer","inventory.adjust","product.view","product.create","product.edit","warehouse.view","warehouse.create","warehouse.edit","purchase_request.view","purchase_request.create","purchase_request.approve","goods_receipt.view","goods_receipt.create","vendor.view","document.view","document.upload","report.view","report.export","notification.view"], isSystem: true, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { name: "Viewer", code: "VIEWER", description: "Read-only access", permissions: ["dashboard.view","project.view","site.view","task.view","inventory.view","product.view","warehouse.view","customer.view","vendor.view","employee.view","document.view","report.view","notification.view"], isSystem: true, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
  ]);
  const superAdminRoleId = rolesResult.insertedIds[0];
  const adminRoleId = rolesResult.insertedIds[1];

  // ─── Users ─────────────────────────────────────────────
  console.log("Creating users...");
  const pw = await bcrypt.hash("admin123", 12);
  const adminPw = await bcrypt.hash("admin", 12);
  const usersResult = await db.collection("users").insertMany([
    { name: "System Admin", username: "admin", email: "admin@dipl.in", password: adminPw, role: superAdminRoleId, phone: "+91 9999999999", department: "Administration", isActive: true, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { name: "Rajesh Kumar", email: "rajesh@dipl.in", password: pw, role: adminRoleId, phone: "+91 9876543210", department: "Operations", isActive: true, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
  ]);

  // ─── Customers ─────────────────────────────────────────
  console.log("Creating customers...");
  const customersResult = await db.collection("customers").insertMany([
    { companyName: "ABC Developers", contactPerson: "Amit Shah", phone: "+91 9811122233", email: "amit@abcdev.com", city: "Mumbai", state: "Maharashtra", customerType: "Developer", gst: "27AABCU9603R1ZN", address: "Andheri West, Mumbai", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { companyName: "Green Heights Realty", contactPerson: "Priya Sharma", phone: "+91 9822233344", email: "priya@greenheights.com", city: "Pune", state: "Maharashtra", customerType: "Residential", address: "Kothrud, Pune", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { companyName: "Metro Mall Corp", contactPerson: "Suresh Reddy", phone: "+91 9833344455", email: "suresh@metromall.com", city: "Hyderabad", state: "Telangana", customerType: "Commercial", address: "Hitech City, Hyderabad", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { companyName: "Sunrise Hospital", contactPerson: "Dr. Anand Rao", phone: "+91 9844455566", email: "admin@sunrisehospital.com", city: "Bengaluru", state: "Karnataka", customerType: "Other", address: "Koramangala, Bengaluru", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { companyName: "Royal Industries", contactPerson: "Vikram Singh", phone: "+91 9855566677", email: "vikram@royalind.com", city: "Chandrapur", state: "Maharashtra", customerType: "Industrial", address: "MIDC, Chandrapur", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
  ]);

  // ─── Vendors ───────────────────────────────────────────
  console.log("Creating vendors...");
  await db.collection("vendors").insertMany([
    { vendorName: "SafeFlame Equipments", contactPerson: "Ramesh Patel", phone: "+91 9877700001", email: "sales@safeflame.com", city: "Ahmedabad", state: "Gujarat", paymentTerms: "Net 30", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { vendorName: "FireGuard Systems", contactPerson: "Manoj Tiwari", phone: "+91 9877700002", email: "info@fireguard.in", city: "Delhi", state: "Delhi", paymentTerms: "Net 45", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { vendorName: "Hydro Fire Solutions", contactPerson: "Kiran Desai", phone: "+91 9877700003", email: "kiran@hydrofire.com", city: "Mumbai", state: "Maharashtra", paymentTerms: "Advance", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
  ]);

  // ─── Employees ─────────────────────────────────────────
  console.log("Creating employees...");
  const empsResult = await db.collection("employees").insertMany([
    { employeeId: "EMP-001", name: "Rajesh Kumar", role: "Manager", department: "Operations", phone: "+91 9876543210", email: "rajesh@dipl.in", status: "active", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { employeeId: "EMP-002", name: "Priya Sharma", role: "Engineer", department: "Projects", phone: "+91 9876543211", email: "priya.s@dipl.in", status: "active", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { employeeId: "EMP-003", name: "Vikram Singh", role: "Technician", department: "Service", phone: "+91 9876543212", email: "vikram.s@dipl.in", status: "active", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { employeeId: "EMP-004", name: "Amit Patel", role: "Store Keeper", department: "Inventory", phone: "+91 9876543213", email: "amit.p@dipl.in", status: "active", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { employeeId: "EMP-005", name: "Neha Gupta", role: "Supervisor", department: "Projects", phone: "+91 9876543214", email: "neha.g@dipl.in", status: "active", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { employeeId: "EMP-006", name: "Sanjay More", role: "Engineer", department: "Projects", phone: "+91 9876543215", email: "sanjay.m@dipl.in", status: "active", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
  ]);

  // ─── Categories ────────────────────────────────────────
  console.log("Creating categories...");
  const catsResult = await db.collection("categories").insertMany([
    { name: "Fire Extinguishers", description: "All types of fire extinguishers", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { name: "Fire Hydrant System", description: "Hydrant valves, hose, landing valves", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { name: "Fire Alarm System", description: "Panels, detectors, MCPs", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { name: "Sprinkler System", description: "Sprinkler heads, pipes, fittings", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { name: "Fire Pump System", description: "Fire pumps, jockey pumps", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { name: "Emergency Lighting", description: "Emergency lights, exit signs", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { name: "Pipes & Fittings", description: "MS/GI pipes, flanges, valves", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { name: "Consumables", description: "Cables, bolts, clamps, etc.", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
  ]);

  // ─── Products ──────────────────────────────────────────
  console.log("Creating products...");
  const productsResult = await db.collection("products").insertMany([
    { sku: "FE-ABC-4KG", name: "Fire Extinguisher ABC 4KG", category: catsResult.insertedIds[0], brand: "SafeFlame", unit: "Nos", purchasePrice: 1200, sellingPrice: 1800, minimumStock: 20, maximumStock: 200, reorderLevel: 30, serialTracking: true, batchTracking: false, warrantyPeriod: 12, isActive: true, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { sku: "FE-CO2-2KG", name: "Fire Extinguisher CO2 2KG", category: catsResult.insertedIds[0], brand: "SafeFlame", unit: "Nos", purchasePrice: 2500, sellingPrice: 3500, minimumStock: 10, maximumStock: 100, reorderLevel: 15, serialTracking: true, batchTracking: false, warrantyPeriod: 12, isActive: true, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { sku: "HV-65MM", name: "Hydrant Valve 65mm", category: catsResult.insertedIds[1], brand: "Hydro Fire", unit: "Nos", purchasePrice: 3500, sellingPrice: 5000, minimumStock: 10, maximumStock: 50, reorderLevel: 15, serialTracking: false, batchTracking: false, isActive: true, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { sku: "LV-65MM", name: "Landing Valve 65mm", category: catsResult.insertedIds[1], brand: "Hydro Fire", unit: "Nos", purchasePrice: 2800, sellingPrice: 4200, minimumStock: 10, maximumStock: 50, reorderLevel: 12, serialTracking: false, batchTracking: false, isActive: true, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { sku: "FAP-8Z", name: "Fire Alarm Panel 8 Zone", category: catsResult.insertedIds[2], brand: "FireGuard", unit: "Nos", purchasePrice: 15000, sellingPrice: 22000, minimumStock: 3, maximumStock: 20, reorderLevel: 5, serialTracking: true, batchTracking: false, warrantyPeriod: 24, isActive: true, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { sku: "SD-PHOTO", name: "Smoke Detector Photoelectric", category: catsResult.insertedIds[2], brand: "FireGuard", unit: "Nos", purchasePrice: 800, sellingPrice: 1400, minimumStock: 50, maximumStock: 500, reorderLevel: 80, serialTracking: false, batchTracking: true, isActive: true, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { sku: "SPR-68C", name: "Sprinkler Head 68°C", category: catsResult.insertedIds[3], brand: "Hydro Fire", unit: "Nos", purchasePrice: 180, sellingPrice: 350, minimumStock: 100, maximumStock: 2000, reorderLevel: 200, serialTracking: false, batchTracking: true, isActive: true, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { sku: "FP-10HP", name: "Fire Pump 10HP", category: catsResult.insertedIds[4], brand: "Hydro Fire", unit: "Nos", purchasePrice: 85000, sellingPrice: 120000, minimumStock: 1, maximumStock: 5, reorderLevel: 2, serialTracking: true, batchTracking: false, warrantyPeriod: 24, isActive: true, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { sku: "EL-LED", name: "Emergency Light LED", category: catsResult.insertedIds[5], brand: "SafeFlame", unit: "Nos", purchasePrice: 600, sellingPrice: 1000, minimumStock: 30, maximumStock: 300, reorderLevel: 50, serialTracking: false, batchTracking: false, isActive: true, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { sku: "PIPE-MS-50", name: "MS Pipe 50mm", category: catsResult.insertedIds[6], brand: "Generic", unit: "Mtrs", purchasePrice: 350, sellingPrice: 500, minimumStock: 100, maximumStock: 1000, reorderLevel: 150, serialTracking: false, batchTracking: false, isActive: true, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
  ]);

  // ─── Warehouses ────────────────────────────────────────
  console.log("Creating warehouses...");
  const whResult = await db.collection("warehouses").insertMany([
    { name: "Main Warehouse", location: "Andheri, Mumbai", latitude: 19.1197, longitude: 72.8468, contactNumber: "+91 22 28001234", status: "active", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { name: "Pune Warehouse", location: "Hinjewadi, Pune", latitude: 18.5913, longitude: 73.7389, contactNumber: "+91 20 25001234", status: "active", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { name: "Chandrapur Store", location: "MIDC, Chandrapur", latitude: 19.9615, longitude: 79.2961, contactNumber: "+91 7172 251234", status: "active", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
  ]);

  // ─── Inventory ─────────────────────────────────────────
  console.log("Creating inventory records...");
  const invItems = [];
  const productIds = Object.values(productsResult.insertedIds);
  const warehouseIds = Object.values(whResult.insertedIds);
  // Main warehouse is stocked to cover the site issues seeded below; Pune keeps a small buffer.
  const mainQty = [440, 120, 150, 100, 12, 1000, 5400, 4, 360, 2700];
  const puneQty = [40, 18, 12, 10, 3, 60, 200, 1, 32, 80];

  for (let pi = 0; pi < productIds.length; pi++) {
    invItems.push(
      { product: productIds[pi], warehouse: warehouseIds[0], quantity: mainQty[pi], reservedQuantity: 0, createdAt: new Date(), updatedAt: new Date() },
      { product: productIds[pi], warehouse: warehouseIds[1], quantity: puneQty[pi], reservedQuantity: 0, createdAt: new Date(), updatedAt: new Date() },
    );
  }
  await db.collection("inventories").insertMany(invItems);

  // ─── Projects ──────────────────────────────────────────
  console.log("Creating projects...");
  const projResult = await db.collection("projects").insertMany([
    { projectId: "PRJ-2024-001", name: "ABC Tower Fire Safety Installation", customer: customersResult.insertedIds[0], projectType: "New Installation", description: "Complete fire safety system for 20-floor commercial tower", startDate: new Date("2024-06-01"), expectedCompletionDate: new Date("2025-03-31"), status: "active", priority: "high", budget: 5000000, location: "Andheri, Mumbai", progress: 45, projectManager: empsResult.insertedIds[0], projectEngineer: empsResult.insertedIds[1], isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { projectId: "PRJ-2024-002", name: "Green Heights Residential Fire Safety", customer: customersResult.insertedIds[1], projectType: "New Installation", description: "Fire safety for 4 residential buildings", startDate: new Date("2024-08-15"), expectedCompletionDate: new Date("2025-06-30"), status: "planning", priority: "medium", budget: 3200000, location: "Kothrud, Pune", progress: 10, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { projectId: "PRJ-2024-003", name: "Metro Mall Fire Safety Upgrade", customer: customersResult.insertedIds[2], projectType: "Renovation", description: "Upgrade existing fire safety systems", startDate: new Date("2024-09-01"), expectedCompletionDate: new Date("2025-01-31"), status: "active", priority: "high", budget: 1800000, location: "Hitech City, Hyderabad", progress: 65, projectManager: empsResult.insertedIds[0], isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { projectId: "PRJ-2024-004", name: "Sunrise Hospital AMC", customer: customersResult.insertedIds[3], projectType: "AMC", description: "Annual maintenance contract for hospital fire systems", startDate: new Date("2024-04-01"), expectedCompletionDate: new Date("2025-03-31"), status: "active", priority: "medium", budget: 800000, location: "Koramangala, Bengaluru", progress: 50, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { projectId: "PRJ-2024-005", name: "Royal Industries Fire System", customer: customersResult.insertedIds[4], projectType: "New Installation", description: "Factory fire protection system", startDate: new Date("2024-10-01"), expectedCompletionDate: new Date("2025-08-31"), status: "draft", priority: "medium", budget: 4500000, location: "MIDC, Chandrapur", progress: 0, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { projectId: "PRJ-2023-010", name: "City Center Fire Safety", customer: customersResult.insertedIds[2], projectType: "New Installation", description: "Completed project", status: "completed", priority: "high", budget: 2500000, location: "Mumbai", progress: 100, actualCompletionDate: new Date("2024-02-15"), isDeleted: false, createdAt: new Date("2023-06-01"), updatedAt: new Date() },
  ]);

  // ─── Sites ─────────────────────────────────────────────
  console.log("Creating sites...");
  const sitesResult = await db.collection("sites").insertMany([
    { siteId: "SITE-001", name: "ABC Tower", latitude: 19.1363, longitude: 72.8277, project: projResult.insertedIds[0], customer: customersResult.insertedIds[0], address: "Plot 45, Andheri West", city: "Mumbai", state: "Maharashtra", pincode: "400053", status: "installation", buildingType: "Commercial", numberOfFloors: 20, siteEngineer: empsResult.insertedIds[1], supervisor: empsResult.insertedIds[4], isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { siteId: "SITE-002", name: "Green Heights Block A", latitude: 18.5074, longitude: 73.8077, project: projResult.insertedIds[1], customer: customersResult.insertedIds[1], address: "Sector 12, Kothrud", city: "Pune", state: "Maharashtra", pincode: "411038", status: "survey", buildingType: "Residential", numberOfFloors: 14, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { siteId: "SITE-003", name: "Green Heights Block B", latitude: 18.5051, longitude: 73.8121, project: projResult.insertedIds[1], customer: customersResult.insertedIds[1], address: "Sector 12, Kothrud", city: "Pune", state: "Maharashtra", pincode: "411038", status: "not_started", buildingType: "Residential", numberOfFloors: 14, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { siteId: "SITE-004", name: "Metro Mall", latitude: 17.4474, longitude: 78.3762, project: projResult.insertedIds[2], customer: customersResult.insertedIds[2], address: "Hitech City Road", city: "Hyderabad", state: "Telangana", pincode: "500081", status: "testing", buildingType: "Commercial", numberOfFloors: 5, siteEngineer: empsResult.insertedIds[5], isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { siteId: "SITE-005", name: "Sunrise Hospital Main Building", latitude: 12.9352, longitude: 77.6245, project: projResult.insertedIds[3], customer: customersResult.insertedIds[3], address: "80 Feet Road, Koramangala", city: "Bengaluru", state: "Karnataka", pincode: "560034", status: "maintenance", buildingType: "Hospital", numberOfFloors: 8, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
  ]);

  // ─── Tasks ─────────────────────────────────────────────
  console.log("Creating tasks...");
  await db.collection("tasks").insertMany([
    { title: "Install hydrant system on floors 1-5", project: projResult.insertedIds[0], site: sitesResult.insertedIds[0], assignedTo: empsResult.insertedIds[1], priority: "high", dueDate: new Date("2024-12-15"), status: "in_progress", progress: 60, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { title: "Fire alarm panel wiring", project: projResult.insertedIds[0], site: sitesResult.insertedIds[0], assignedTo: empsResult.insertedIds[2], priority: "medium", dueDate: new Date("2024-12-20"), status: "todo", progress: 0, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { title: "Sprinkler installation floors 6-10", project: projResult.insertedIds[0], site: sitesResult.insertedIds[0], assignedTo: empsResult.insertedIds[5], priority: "high", dueDate: new Date("2025-01-15"), status: "todo", progress: 0, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { title: "Site survey - Block A", project: projResult.insertedIds[1], site: sitesResult.insertedIds[1], assignedTo: empsResult.insertedIds[1], priority: "medium", dueDate: new Date("2024-11-30"), status: "completed", progress: 100, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { title: "Pressure testing - Metro Mall", project: projResult.insertedIds[2], site: sitesResult.insertedIds[3], assignedTo: empsResult.insertedIds[5], priority: "critical", dueDate: new Date("2024-12-10"), status: "in_progress", progress: 40, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { title: "Fire extinguisher inspection - Hospital", project: projResult.insertedIds[3], site: sitesResult.insertedIds[4], assignedTo: empsResult.insertedIds[2], priority: "medium", dueDate: new Date("2024-11-25"), status: "completed", progress: 100, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { title: "Emergency lighting check", project: projResult.insertedIds[3], site: sitesResult.insertedIds[4], assignedTo: empsResult.insertedIds[2], priority: "low", dueDate: new Date("2025-01-10"), status: "todo", progress: 0, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { title: "Material requisition for Block B", project: projResult.insertedIds[1], site: sitesResult.insertedIds[2], assignedTo: empsResult.insertedIds[3], priority: "medium", dueDate: new Date("2025-02-01"), status: "blocked", progress: 20, description: "Waiting for project approval before ordering materials", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
  ]);

  // ─── Service Requests ──────────────────────────────────
  console.log("Creating service requests...");
  await db.collection("servicerequests").insertMany([
    { serviceId: "SRV-2024-001", customer: customersResult.insertedIds[3], site: sitesResult.insertedIds[4], equipment: "Fire Extinguisher ABC 4KG", complaint: "Extinguisher pressure gauge showing low", priority: "high", assignedTo: empsResult.insertedIds[2], scheduledDate: new Date("2024-12-05"), status: "scheduled", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { serviceId: "SRV-2024-002", customer: customersResult.insertedIds[2], site: sitesResult.insertedIds[3], equipment: "Fire Alarm Panel 8 Zone", complaint: "Zone 3 showing fault", priority: "critical", assignedTo: empsResult.insertedIds[2], status: "in_progress", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { serviceId: "SRV-2024-003", customer: customersResult.insertedIds[0], site: sitesResult.insertedIds[0], equipment: "Smoke Detector", complaint: "Multiple false alarms on floor 12", priority: "medium", status: "open", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
  ]);

  // ─── Site Visits ───────────────────────────────────────
  console.log("Creating site visits...");
  await db.collection("sitevisits").insertMany([
    { site: sitesResult.insertedIds[0], employee: empsResult.insertedIds[1], visitDate: new Date("2024-11-20"), checkInTime: new Date("2024-11-20T10:00:00"), checkOutTime: new Date("2024-11-20T17:30:00"), purpose: "Hydrant installation supervision", workCompleted: "Floors 1-3 hydrant piping completed", nextAction: "Continue floors 4-5 next week", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { site: sitesResult.insertedIds[3], employee: empsResult.insertedIds[5], visitDate: new Date("2024-11-22"), checkInTime: new Date("2024-11-22T09:30:00"), checkOutTime: new Date("2024-11-22T16:00:00"), purpose: "Pressure testing", workCompleted: "Hydrant system pressure test completed - passed", issuesFound: "Minor leak on floor 3 junction - fixed", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    { site: sitesResult.insertedIds[4], employee: empsResult.insertedIds[2], visitDate: new Date("2024-11-25"), checkInTime: new Date("2024-11-25T11:00:00"), checkOutTime: new Date("2024-11-25T14:00:00"), purpose: "Quarterly fire extinguisher inspection", workCompleted: "All 45 extinguishers inspected, 3 need refilling", issuesFound: "3 extinguishers past refill date", nextAction: "Schedule refilling pickup", isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
  ]);

  // ─── BOQ (bill of quantities) ──────────────────────────
  console.log("Creating BOQ lines...");
  const P = projResult.insertedIds;
  type BoqLine = [string, string, string, string, number, number, number];
  const boq: [number, BoqLine[]][] = [
    [0, [
      ["1.1", "Hydrant", "Single headed landing valve 63mm with instantaneous coupling, IS:5290", "Nos", 40, 4200, 1200],
      ["1.2", "Hydrant", "First-aid hose reel drum with 30m rubber hose and nozzle", "Nos", 40, 6500, 1500],
      ["1.3", "Hydrant", "MS 'C' class pipe 150mm incl. fittings, supports and painting", "Mtr", 900, 1650, 650],
      ["2.1", "Sprinkler", "Pendent sprinkler 68°C K-5.6, chrome plated", "Nos", 1600, 320, 140],
      ["3.1", "Fire alarm", "Photoelectric smoke detector, addressable, with base", "Nos", 400, 1300, 350],
      ["3.2", "Fire alarm", "8-zone conventional fire alarm panel with battery backup", "Nos", 2, 21000, 6000],
      ["4.1", "Portable", "ABC dry powder extinguisher 4kg with wall bracket", "Nos", 120, 1700, 100],
      ["5.1", "Lighting", "LED emergency light, 3-hour backup", "Nos", 300, 950, 250],
    ]],
    [1, [
      ["1.1", "Hydrant", "Single headed landing valve 63mm with instantaneous coupling", "Nos", 56, 4200, 1200],
      ["1.2", "Hydrant", "First-aid hose reel drum with 30m rubber hose", "Nos", 56, 6500, 1500],
      ["1.3", "Hydrant", "MS 'C' class pipe 150mm incl. fittings and painting", "Mtr", 600, 1650, 650],
      ["2.1", "Sprinkler", "Pendent sprinkler 68°C K-5.6", "Nos", 2000, 320, 140],
      ["4.1", "Portable", "ABC dry powder extinguisher 4kg", "Nos", 100, 1700, 100],
    ]],
    [2, [
      ["1.1", "Sprinkler", "Replacement of pendent sprinkler heads 68°C", "Nos", 1200, 330, 120],
      ["1.2", "Fire alarm", "Replacement photoelectric smoke detectors", "Nos", 300, 1350, 300],
      ["1.3", "Hydrant", "Hydrant valve 65mm replacement incl. testing", "Nos", 30, 4800, 1400],
      ["1.4", "Hydrant", "MS pipe 50mm re-routing with fittings", "Mtr", 600, 520, 230],
      ["1.5", "Lighting", "LED emergency light replacement", "Nos", 120, 950, 200],
    ]],
    [3, [
      ["1.1", "AMC", "Quarterly inspection of all portable extinguishers", "Visit", 4, 0, 45000],
      ["1.2", "AMC", "Refilling of ABC extinguishers incl. hydro test", "Nos", 120, 1200, 300],
      ["1.3", "AMC", "Replacement of faulty smoke detectors", "Nos", 150, 1300, 250],
      ["1.4", "AMC", "Fire alarm panel annual maintenance", "Year", 1, 60000, 150000],
    ]],
  ];
  const boqDocs = boq.flatMap(([pi, lines]) =>
    lines.map(([itemNo, section, description, unit, quantity, supplyRate, installRate]) => ({
      project: P[pi], itemNo, section, description, unit, quantity, supplyRate, installRate,
      createdAt: new Date(), updatedAt: new Date(),
    }))
  );
  await db.collection("boqitems").insertMany(boqDocs);

  // ─── Site material movements (issue → consume → return) ──
  console.log("Creating site material movements...");
  const adminId = usersResult.insertedIds[0];
  const projSite: Record<number, unknown> = { 0: sitesResult.insertedIds[0], 1: sitesResult.insertedIds[1], 2: sitesResult.insertedIds[3], 3: sitesResult.insertedIds[4] };
  // [projectIndex, productIndex, issued, consumed, returned]
  const moves: [number, number, number, number, number][] = [
    [5, 6, 1800, 1800, 0], [5, 9, 900, 880, 20], [5, 5, 300, 300, 0], [5, 2, 40, 40, 0], [5, 4, 3, 3, 0], [5, 0, 150, 150, 0],
    [0, 6, 1400, 1250, 0], [0, 9, 1000, 900, 20], [0, 2, 45, 40, 0], [0, 5, 350, 320, 0],
    [0, 0, 120, 110, 0], [0, 8, 150, 130, 0], [0, 4, 2, 2, 0], [0, 7, 1, 1, 0],
    [1, 9, 150, 80, 0], [1, 2, 10, 4, 0], [1, 6, 300, 100, 0],
    [2, 6, 900, 820, 30], [2, 5, 220, 200, 0], [2, 2, 28, 26, 0], [2, 9, 500, 450, 20], [2, 8, 90, 80, 0],
    [3, 0, 150, 140, 0], [3, 5, 90, 80, 0], [3, 4, 1, 1, 0],
  ];
  const onHand = [...mainQty];
  const txns: Record<string, unknown>[] = [];
  const day = 86400000;
  moves.forEach(([pi, prod, issued, consumed, returned], i) => {
    const base = Date.now() - (150 - i * 5) * day;
    const common = { product: productIds[prod], warehouse: warehouseIds[0], project: P[pi], site: projSite[pi], createdBy: adminId };
    const before = onHand[prod];
    onHand[prod] -= issued;
    txns.push({ ...common, type: "site_issue", quantity: issued, previousQuantity: before, newQuantity: onHand[prod], notes: "Dispatch to site", createdAt: new Date(base) });
    txns.push({ ...common, type: "consumed", quantity: consumed, previousQuantity: onHand[prod], newQuantity: onHand[prod], notes: "Consumed at site", createdAt: new Date(base + 9 * day) });
    if (returned > 0) {
      const b = onHand[prod];
      onHand[prod] += returned;
      txns.push({ ...common, type: "site_return", quantity: returned, previousQuantity: b, newQuantity: onHand[prod], notes: "Surplus returned to store", createdAt: new Date(base + 14 * day) });
    }
  });
  await db.collection("stocktransactions").insertMany(txns);
  for (let pi = 0; pi < productIds.length; pi++) {
    await db.collection("inventories").updateOne({ product: productIds[pi], warehouse: warehouseIds[0] }, { $set: { quantity: onHand[pi] } });
  }

  // ─── Project cost entries ──────────────────────────────
  console.log("Creating project cost entries...");
  // [projectIndex, daysAgo, type, description, amount]
  const costRows: [number, number, string, string, number][] = [
    [5, 240, "labour", "Installation gang — full scope", 420000],
    [5, 230, "transport", "Material deliveries", 60000],
    [5, 220, "overhead", "Supervision & handover documentation", 70000],
    [0, 95, "labour", "Fabrication & erection gang — hydrant risers", 142000],
    [0, 62, "labour", "Fabrication & erection gang — sprinkler mains", 168000],
    [0, 30, "labour", "Fire alarm wiring sub-contract", 96000],
    [0, 58, "transport", "Site deliveries & shifting", 24000],
    [0, 20, "overhead", "Site supervision & establishment", 38000],
    [1, 40, "labour", "Survey & marking crew", 62000],
    [1, 15, "labour", "Pipe fabrication — Block A", 31000],
    [1, 12, "transport", "Material shifting to Kothrud", 9000],
    [1, 10, "overhead", "Site office set-up", 16000],
    [2, 80, "labour", "Sprinkler replacement crew", 118000],
    [2, 45, "labour", "Pressure testing & commissioning", 86000],
    [2, 25, "labour", "Detector replacement sub-contract", 58000],
    [2, 50, "transport", "Night-shift deliveries (mall hours)", 21000],
    [2, 18, "overhead", "Supervision & permits", 19000],
    [3, 70, "labour", "Quarterly inspection — Q1", 45000],
    [3, 35, "labour", "Refilling & hydro test team", 52000],
    [3, 10, "labour", "Detector replacement visit", 43000],
    [3, 34, "transport", "Extinguisher pickup & drop", 14000],
    [3, 9, "overhead", "AMC coordination", 16000],
  ];
  await db.collection("projectcosts").insertMany(
    costRows.map(([pi, ago, type, description, amount]) => ({
      project: P[pi], date: new Date(Date.now() - ago * day), type, description, amount, createdBy: adminId, createdAt: new Date(),
    }))
  );

  console.log("\n✓ Seed completed successfully!");
  console.log("──────────────────────────────────");
  console.log("Login:  admin / admin   (or rajesh@dipl.in / admin123)");
  console.log("──────────────────────────────────");
  console.log(`\nCreated:`);
  console.log(`  6 Roles`);
  console.log(`  2 Users`);
  console.log(`  5 Customers`);
  console.log(`  3 Vendors`);
  console.log(`  6 Employees`);
  console.log(`  8 Categories`);
  console.log(`  10 Products`);
  console.log(`  3 Warehouses`);
  console.log(`  20 Inventory records`);
  console.log(`  6 Projects`);
  console.log(`  5 Sites`);
  console.log(`  8 Tasks`);
  console.log(`  3 Service Requests`);
  console.log(`  3 Site Visits`);
  console.log(`  ${boqDocs.length} BOQ lines`);
  console.log(`  ${txns.length} Site stock movements`);
  console.log(`  ${costRows.length} Project cost entries`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
