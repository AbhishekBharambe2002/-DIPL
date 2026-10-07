# Development Plan — FireSafe ERP

## Phase 1: Foundation (Current)
- [x] Next.js project setup
- [x] TypeScript, Tailwind CSS
- [x] Architecture documentation
- [ ] Database connection and base models
- [ ] Authentication (NextAuth.js)
- [ ] Application layout (sidebar, header, breadcrumbs)
- [ ] Reusable component library
- [ ] RBAC foundation (roles, permissions, middleware)
- [ ] Dashboard shell
- [ ] Seed data

## Phase 2: RBAC & User Management
- User CRUD
- Role management UI
- Permission assignment UI
- Login / logout pages
- Protected routes
- API authorization middleware

## Phase 3: Master Data
- Customer CRUD
- Vendor CRUD
- Employee CRUD
- Product categories
- Product master
- Warehouse management

## Phase 4: Inventory
- Inventory dashboard
- Stock levels (per product per warehouse)
- Stock transactions (issue, receive, transfer, adjust)
- Material requests
- Low stock alerts
- Stock movement reports

## Phase 5: Projects & Sites
- Project CRUD with full lifecycle
- Site CRUD within projects
- Building / floor / area management
- Fire-safety system management
- Task management
- Site visit tracking
- Site activity timeline

## Phase 6: Procurement
- Purchase request workflow
- Purchase order creation
- Goods receipt
- Vendor delivery tracking

## Phase 7: Service & Maintenance
- Service request tickets
- Asset/equipment tracking
- Maintenance schedules
- Inspection management

## Phase 8: Documents
- File upload/download
- Document metadata
- Entity-linked documents

## Phase 9: Reports
- Inventory reports
- Project reports
- Site reports
- Service reports
- Procurement reports
- Export (CSV, Excel)

## Phase 10: Notifications
- In-app notification system
- Notification triggers (low stock, overdue, etc.)
- Architecture for email/SMS/push

## Phase 11: Audit & Optimization
- Audit log viewer
- Performance optimization
- Database indexes
- Caching layer
- Global search
