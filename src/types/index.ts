import { Types } from "mongoose";

// ─── Common ──────────────────────────────────────────────
export type ObjectId = Types.ObjectId;

export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown[];
  };
  pagination?: PaginatedResponse<unknown>["pagination"];
}

// ─── Enums ───────────────────────────────────────────────
export const ProjectStatus = {
  DRAFT: "draft",
  PLANNING: "planning",
  APPROVED: "approved",
  ACTIVE: "active",
  ON_HOLD: "on_hold",
  DELAYED: "delayed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const SiteStatus = {
  NOT_STARTED: "not_started",
  SURVEY: "survey",
  PLANNING: "planning",
  INSTALLATION: "installation",
  TESTING: "testing",
  COMMISSIONING: "commissioning",
  COMPLETED: "completed",
  MAINTENANCE: "maintenance",
  ON_HOLD: "on_hold",
} as const;
export type SiteStatus = (typeof SiteStatus)[keyof typeof SiteStatus];

export const TaskStatus = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  BLOCKED: "blocked",
  COMPLETED: "completed",
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const Priority = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const StockTransactionType = {
  PURCHASE: "purchase",
  STOCK_IN: "stock_in",
  STOCK_OUT: "stock_out",
  SITE_ISSUE: "site_issue",
  SITE_RETURN: "site_return",
  TRANSFER: "transfer",
  ADJUSTMENT: "adjustment",
  DAMAGED: "damaged",
  LOST: "lost",
  CONSUMED: "consumed",
} as const;
export type StockTransactionType =
  (typeof StockTransactionType)[keyof typeof StockTransactionType];

export const ServiceStatus = {
  OPEN: "open",
  ASSIGNED: "assigned",
  SCHEDULED: "scheduled",
  IN_PROGRESS: "in_progress",
  WAITING: "waiting",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;
export type ServiceStatus = (typeof ServiceStatus)[keyof typeof ServiceStatus];

export const MaterialRequestStatus = {
  REQUESTED: "requested",
  APPROVED: "approved",
  ISSUED: "issued",
  RECEIVED: "received",
  CONSUMED: "consumed",
  RETURNED: "returned",
  CANCELLED: "cancelled",
} as const;
export type MaterialRequestStatus =
  (typeof MaterialRequestStatus)[keyof typeof MaterialRequestStatus];

export const PurchaseOrderStatus = {
  DRAFT: "draft",
  SENT: "sent",
  ACKNOWLEDGED: "acknowledged",
  PARTIALLY_DELIVERED: "partially_delivered",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;
export type PurchaseOrderStatus =
  (typeof PurchaseOrderStatus)[keyof typeof PurchaseOrderStatus];

export const FireSystemType = {
  HYDRANT: "fire_hydrant",
  SPRINKLER: "fire_sprinkler",
  ALARM: "fire_alarm",
  DETECTION: "fire_detection",
  PUMP: "fire_pump",
  EXTINGUISHING: "fire_extinguishing",
  EMERGENCY_LIGHTING: "emergency_lighting",
  FIRE_DOOR: "fire_door",
  SMOKE_EXTRACTION: "smoke_extraction",
  HOSE_REEL: "fire_hose_reel",
  OTHER: "other",
} as const;
export type FireSystemType =
  (typeof FireSystemType)[keyof typeof FireSystemType];

// ─── Roles ───────────────────────────────────────────────
export const RoleCode = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  PROJECT_MANAGER: "PROJECT_MANAGER",
  SITE_ENGINEER: "SITE_ENGINEER",
  SITE_SUPERVISOR: "SITE_SUPERVISOR",
  INVENTORY_MANAGER: "INVENTORY_MANAGER",
  PROCUREMENT_MANAGER: "PROCUREMENT_MANAGER",
  SERVICE_MANAGER: "SERVICE_MANAGER",
  TECHNICIAN: "TECHNICIAN",
  STORE_KEEPER: "STORE_KEEPER",
  ACCOUNTS: "ACCOUNTS",
  VIEWER: "VIEWER",
} as const;
export type RoleCode = (typeof RoleCode)[keyof typeof RoleCode];
