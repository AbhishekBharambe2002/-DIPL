# Database Design — FireSafe ERP

## Database

MongoDB with Mongoose ODM.

## Collections

### Core / Auth
| Collection | Purpose |
|-----------|---------|
| users | System users with auth credentials |
| roles | Named roles (Admin, Project Manager, etc.) |
| permissions | Granular permission definitions |

### CRM
| Collection | Purpose |
|-----------|---------|
| customers | Customer companies and contacts |
| vendors | Supplier companies and contacts |
| employees | Operational staff (not HR-heavy) |

### Operations
| Collection | Purpose |
|-----------|---------|
| projects | Major contracts / assignments |
| sites | Physical locations within projects |
| buildings | Building details within sites |
| fire_systems | Fire-safety systems installed at sites |
| tasks | Work items linked to projects/sites/services |
| site_visits | Check-in/out records for site attendance |

### Inventory
| Collection | Purpose |
|-----------|---------|
| categories | Product categories and subcategories |
| products | Product master catalog |
| warehouses | Storage locations |
| inventory | Stock levels per product per warehouse |
| stock_transactions | Every stock movement (immutable ledger) |
| material_requests | Site material requirement workflow |

### Procurement
| Collection | Purpose |
|-----------|---------|
| purchase_requests | Internal purchase requisitions |
| purchase_orders | Orders sent to vendors |
| goods_receipts | Delivery confirmations |

### Service
| Collection | Purpose |
|-----------|---------|
| service_requests | Maintenance/repair tickets |
| maintenance_schedules | Recurring maintenance definitions |
| assets | Individually tracked equipment (serial numbers) |

### Support
| Collection | Purpose |
|-----------|---------|
| documents | File metadata (URLs, relations) |
| notifications | In-app notification records |
| audit_logs | Immutable action history |
| settings | System configuration key-value |

## Key Relationships

```
Customer → Project (1:N)
Project → Site (1:N)
Site → Building (1:1 or 1:N)
Site → FireSystem (1:N)
Site → Task (1:N)
Site → SiteVisit (1:N)
Site → MaterialRequest (1:N)
Product → Inventory (1:N, per warehouse)
Inventory → StockTransaction (1:N)
PurchaseRequest → PurchaseOrder (1:1)
PurchaseOrder → GoodsReceipt (1:N)
ServiceRequest → Asset (N:1)
Employee → SiteVisit (1:N)
Employee → Task (1:N)
```

## Common Field Patterns

All documents include:
- `_id` (ObjectId, auto)
- `createdAt` (Date, auto)
- `updatedAt` (Date, auto)
- `createdBy` (ObjectId → users)
- `isDeleted` (Boolean, default false) — soft delete

## Indexes

Priority indexes:
- `projects`: status, customerId, createdAt
- `sites`: projectId, status
- `inventory`: productId + warehouseId (compound unique)
- `stock_transactions`: productId, warehouseId, createdAt
- `tasks`: projectId, siteId, assignedTo, status
- `site_visits`: siteId, employeeId, visitDate
- `audit_logs`: module, recordId, createdAt
- `service_requests`: siteId, status, scheduledDate
- `products`: sku (unique), categoryId
