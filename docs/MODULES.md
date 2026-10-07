# Module Breakdown — FireSafe ERP

## Module List

### 1. Dashboard
- Operational command center
- KPI cards for projects, sites, inventory, work, service, procurement
- Charts (project status distribution, stock trends, service pipeline)
- Activity feed (recent actions across the system)
- Filterable by date, project, site, employee, status

### 2. Project Management
- CRUD for projects
- Status workflow: Draft → Planning → Approved → Active → On Hold/Delayed → Completed/Cancelled
- Tabs: Overview, Sites, Tasks, Materials, Team, Documents, Activity
- Links to sites, tasks, inventory consumption, employees

### 3. Site Management
- CRUD for sites within projects
- Status workflow: Not Started → Survey → Planning → Installation → Testing → Commissioning → Completed → Maintenance
- Tabs: Overview, Building, Systems, Equipment, Tasks, Inventory, Employees, Visits, Issues, Documents, Timeline

### 4. Site Tracking
- Site visit check-in/out with GPS
- Activity timeline per site
- Visit history with purpose, work completed, issues found

### 5. Inventory Management
- Product master catalog (categories, SKUs, brands)
- Warehouse-wise stock tracking
- Stock movements: Purchase, In, Out, Issue, Return, Transfer, Adjustment, Damaged, Lost
- Low stock alerts
- Material request workflow

### 6. Procurement
- Purchase Request → Approval → Purchase Order → Goods Receipt
- Vendor selection and tracking
- Delivery tracking

### 7. Service & Maintenance
- Service request tickets
- Equipment/asset tracking with serial numbers
- Maintenance schedules (recurring)
- Inspection history

### 8. Customer Management
- Customer master with projects, sites, contracts

### 9. Vendor Management
- Vendor master with products, purchase orders, performance

### 10. Employee / Team Management
- Operational assignment tracking
- Assignment to projects, sites, tasks, visits

### 11. Task Management
- Tasks linked to projects, sites, systems, service requests
- Status: Todo → In Progress → Blocked → Completed

### 12. Document Management
- File metadata storage (URLs to object storage)
- Linked to any entity (customer, project, site, vendor, PO, etc.)

### 13. Reports
- Inventory, project, site, service, procurement reports
- Filters, date ranges, CSV/Excel export

### 14. Notifications
- In-app notification system
- Triggered by stock alerts, task overdue, service due, etc.
- Architecture extensible to email/SMS/push

### 15. User Management & RBAC
- User CRUD
- Role assignment
- Granular permissions
- Route and API protection

### 16. Audit Logs
- Immutable log of all significant operations
- User, action, module, record, old/new values, timestamp

### 17. Settings
- System configuration (company info, defaults, notification preferences)
