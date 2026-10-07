# Role-Based Access Control — FireSafe ERP

## Roles

| Role | Code | Description |
|------|------|-------------|
| Super Admin | SUPER_ADMIN | Full system access |
| Admin | ADMIN | Full operational access, limited system settings |
| Project Manager | PROJECT_MANAGER | Manage projects, sites, teams, tasks |
| Site Engineer | SITE_ENGINEER | Manage assigned sites, visits, tasks |
| Site Supervisor | SITE_SUPERVISOR | View sites, log visits, update tasks |
| Inventory Manager | INVENTORY_MANAGER | Full inventory, stock, warehouse access |
| Procurement Manager | PROCUREMENT_MANAGER | Purchase requests, orders, vendor management |
| Service Manager | SERVICE_MANAGER | Service requests, maintenance, inspections |
| Technician | TECHNICIAN | Assigned tasks, visits, service work |
| Store Keeper | STORE_KEEPER | Stock in/out, material issue, warehouse ops |
| Accounts | ACCOUNTS | View financials, procurement, reports |
| Viewer | VIEWER | Read-only access across modules |

## Permission Format

`module.action`

## Permission Catalog

### Dashboard
- dashboard.view

### Projects
- project.view
- project.create
- project.edit
- project.delete
- project.manage_team

### Sites
- site.view
- site.create
- site.edit
- site.delete
- site.visit

### Tasks
- task.view
- task.create
- task.edit
- task.assign
- task.delete

### Inventory
- inventory.view
- inventory.create
- inventory.edit
- inventory.issue
- inventory.receive
- inventory.transfer
- inventory.adjust

### Products
- product.view
- product.create
- product.edit
- product.delete

### Warehouses
- warehouse.view
- warehouse.create
- warehouse.edit

### Procurement
- purchase_request.view
- purchase_request.create
- purchase_request.approve
- purchase_order.view
- purchase_order.create
- purchase_order.approve
- goods_receipt.view
- goods_receipt.create

### Service
- service.view
- service.create
- service.assign
- service.complete

### Customers
- customer.view
- customer.create
- customer.edit

### Vendors
- vendor.view
- vendor.create
- vendor.edit

### Employees
- employee.view
- employee.create
- employee.edit

### Documents
- document.view
- document.upload
- document.delete

### Reports
- report.view
- report.export

### Users & Roles
- user.view
- user.create
- user.edit
- user.delete
- role.view
- role.create
- role.edit

### Audit
- audit.view

### Settings
- settings.view
- settings.edit

### Notifications
- notification.view

## Default Role-Permission Matrix

| Permission | SUPER_ADMIN | ADMIN | PROJECT_MANAGER | SITE_ENGINEER | INVENTORY_MANAGER | VIEWER |
|------------|:-:|:-:|:-:|:-:|:-:|:-:|
| dashboard.view | x | x | x | x | x | x |
| project.view | x | x | x | x | - | x |
| project.create | x | x | x | - | - | - |
| project.edit | x | x | x | - | - | - |
| inventory.view | x | x | - | - | x | x |
| inventory.issue | x | x | - | - | x | - |
| user.create | x | x | - | - | - | - |
| audit.view | x | x | - | - | - | - |
| settings.edit | x | - | - | - | - | - |

(Full matrix seeded in the database)

## Enforcement

1. **API middleware** — Every route handler checks `requirePermission('module.action')`
2. **UI guards** — Components use `usePermission('module.action')` hook to show/hide
3. **Server components** — Check permissions before rendering sensitive data
