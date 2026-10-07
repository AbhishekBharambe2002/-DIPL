# Architecture Overview — FireSafe ERP

## System Purpose

Centralized web-based ERP/operations platform for a fire-safety company managing projects, sites, inventory, equipment, procurement, installation, servicing, employees, documents, and tracking.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Backend | Next.js Route Handlers (API routes) |
| Database | MongoDB with Mongoose ODM |
| Authentication | NextAuth.js v5 (credentials provider) |
| Validation | Zod |
| Charts | Recharts |
| Icons | Lucide React |
| Forms | React Hook Form + Zod resolver |

## Architecture Pattern

**Module-based monolith** within Next.js App Router:

- Each business domain (projects, inventory, sites, etc.) is a self-contained module
- Shared utilities, types, and components live in common directories
- API routes are co-located under `/src/app/api/`
- Database models are centralized under `/src/server/models/`
- Business logic lives in service layers under `/src/server/services/`

## Key Architectural Decisions

1. **Next.js App Router** — Server components by default, client components only when interactivity is needed
2. **MongoDB** — Document model suits the hierarchical nature of projects > sites > systems > equipment
3. **Server-side authorization** — All API routes validate permissions, not just the UI
4. **Soft deletes** — Critical business records are never hard-deleted
5. **Audit trail** — Every significant mutation creates an audit log entry
6. **Stock transactions** — Inventory quantities are never directly modified; every change goes through a stock transaction

## Data Flow

```
Browser → Next.js Server Component / API Route
    → Auth middleware (session check)
    → RBAC middleware (permission check)
    → Zod validation
    → Service layer (business logic)
    → Mongoose model (database)
    → Audit log (side effect)
    → Response
```

## Module Boundaries

Each module owns:
- Its database models (schemas)
- Its API routes
- Its service layer (business logic)
- Its UI pages and components
- Its Zod validation schemas

Modules communicate through:
- Shared TypeScript types
- Database references (ObjectId)
- Service layer imports (for cross-module operations)

## Security Model

- JWT-based sessions via NextAuth.js
- Role-based access control with granular permissions
- Server-side permission checks on every API route
- Input validation with Zod on every mutation
- Password hashing with bcrypt
- Environment variables for secrets

## Scalability Considerations

- Pagination on all list endpoints
- Database indexes on frequently queried fields
- Server-side filtering and sorting
- Debounced search
- Aggregation pipelines for dashboard KPIs
