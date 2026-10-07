# Business Workflows — FireSafe ERP

## 1. Project Lifecycle

```
Customer Requirement
  → Create Customer (if new)
  → Create Project (Draft)
  → Add Sites to Project
  → Plan systems, equipment, materials
  → Approve Project
  → Active — installation work begins
  → Track progress via tasks, visits, material issues
  → Testing & Commissioning
  → Project Completed
  → Ongoing Maintenance (optional)
```

## 2. Site Installation Workflow

```
Site Created (Not Started)
  → Survey
  → Planning (identify systems, equipment, materials)
  → Installation (assign engineers, issue materials)
  → Testing (pressure tests, alarm tests, etc.)
  → Commissioning (final sign-off)
  → Completed
  → Maintenance phase
```

## 3. Inventory / Stock Movement

```
Stock In:
  Goods Receipt → Stock Transaction (PURCHASE) → Inventory quantity increases

Stock Out:
  Material Request → Approval → Issue from Warehouse
  → Stock Transaction (SITE_ISSUE) → Inventory quantity decreases
  → Material assigned to Site

Return:
  Site Return → Stock Transaction (SITE_RETURN) → Inventory quantity increases

Transfer:
  Warehouse A → Warehouse B
  → Stock Transaction (TRANSFER_OUT from A)
  → Stock Transaction (TRANSFER_IN to B)

Adjustment:
  Physical count differs → Stock Transaction (ADJUSTMENT)
```

**Rule: Inventory quantity is NEVER directly modified. All changes flow through stock_transactions.**

## 4. Procurement Workflow

```
Material Requirement identified
  → Purchase Request created
  → Approval (by manager)
  → Purchase Order created (sent to vendor)
  → Vendor delivers
  → Goods Receipt recorded
  → Quality check
  → Stock added via Stock Transaction (PURCHASE)
```

## 5. Material Issue to Site

```
Site Engineer requests material
  → Material Request created
  → Inventory Manager approves
  → Warehouse issues stock
  → Stock Transaction (SITE_ISSUE)
  → Material received at site
  → Material consumed / installed
  → Unused material returned → Stock Transaction (SITE_RETURN)
```

## 6. Service & Maintenance

```
Service Request created (customer complaint or scheduled)
  → Assigned to technician
  → Scheduled
  → Technician visits site
  → Work performed
  → Resolution recorded
  → Service completed
```

## 7. Maintenance Schedule

```
Equipment has maintenance interval (e.g., 6 months)
  → System generates upcoming maintenance tasks
  → Service requests created automatically
  → Follow service workflow
```

## 8. Site Visit Tracking

```
Employee arrives at site
  → Check-in (time, GPS, purpose)
  → Log activities throughout the day
  → Check-out (time, summary, next actions)
  → Visit appears on site timeline
```

## 9. Audit Trail

Every significant action creates an audit log entry:
- User who performed the action
- Module affected
- Record ID
- Action type (create, update, delete, status_change)
- Previous and new values (for updates)
- Timestamp
