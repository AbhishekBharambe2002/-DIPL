# API Structure — FireSafe ERP

## Base URL

All API routes are under `/api/`.

## Authentication

All routes require authentication except `/api/auth/*`.

## Standard Response Format

```json
{
  "success": true,
  "data": { ... },
  "pagination": { "page": 1, "limit": 20, "total": 150, "pages": 8 }
}
```

```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] }
}
```

## Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/signin | Sign in |
| POST | /api/auth/signout | Sign out |
| GET | /api/auth/session | Get current session |

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/users | List users (paginated) |
| POST | /api/users | Create user |
| GET | /api/users/:id | Get user |
| PATCH | /api/users/:id | Update user |

### Roles & Permissions
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/roles | List roles |
| POST | /api/roles | Create role |
| PATCH | /api/roles/:id | Update role |
| GET | /api/permissions | List all permissions |

### Customers
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/customers | List customers |
| POST | /api/customers | Create customer |
| GET | /api/customers/:id | Get customer |
| PATCH | /api/customers/:id | Update customer |

### Vendors
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/vendors | List vendors |
| POST | /api/vendors | Create vendor |
| GET | /api/vendors/:id | Get vendor |
| PATCH | /api/vendors/:id | Update vendor |

### Employees
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/employees | List employees |
| POST | /api/employees | Create employee |
| GET | /api/employees/:id | Get employee |
| PATCH | /api/employees/:id | Update employee |

### Projects
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/projects | List projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Get project |
| PATCH | /api/projects/:id | Update project |

### Sites
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/sites | List sites |
| POST | /api/sites | Create site |
| GET | /api/sites/:id | Get site |
| PATCH | /api/sites/:id | Update site |

### Site Visits
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/site-visits | List visits |
| POST | /api/site-visits | Create visit |
| PATCH | /api/site-visits/:id | Update visit (check-out) |

### Inventory / Products
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/products | List products |
| POST | /api/products | Create product |
| GET | /api/products/:id | Get product |
| PATCH | /api/products/:id | Update product |
| GET | /api/categories | List categories |
| POST | /api/categories | Create category |

### Warehouses
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/warehouses | List warehouses |
| POST | /api/warehouses | Create warehouse |

### Stock
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/inventory | List inventory (product x warehouse) |
| GET | /api/stock-transactions | List stock transactions |
| POST | /api/stock-transactions | Create stock transaction (issue, receive, transfer, etc.) |

### Material Requests
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/material-requests | List |
| POST | /api/material-requests | Create |
| PATCH | /api/material-requests/:id | Update / approve |

### Procurement
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/purchase-requests | List |
| POST | /api/purchase-requests | Create |
| GET | /api/purchase-orders | List |
| POST | /api/purchase-orders | Create |
| GET | /api/goods-receipts | List |
| POST | /api/goods-receipts | Create |

### Service
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/service-requests | List |
| POST | /api/service-requests | Create |
| PATCH | /api/service-requests/:id | Update |

### Tasks
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/tasks | List tasks |
| POST | /api/tasks | Create task |
| PATCH | /api/tasks/:id | Update task |

### Documents
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/documents | List documents |
| POST | /api/documents | Upload/create document |

### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/dashboard/kpis | Aggregated KPI data |
| GET | /api/dashboard/activity | Recent activity feed |

### Audit Logs
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/audit-logs | List audit logs (admin only) |

### Notifications
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/notifications | List user notifications |
| PATCH | /api/notifications/:id | Mark as read |

### Search
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/search?q=term | Global search across entities |

## Query Parameters (standard)

All list endpoints support:
- `page` (default 1)
- `limit` (default 20, max 100)
- `sort` (field name, prefix `-` for desc)
- `search` (text search)
- `status` (filter)
- Additional entity-specific filters
