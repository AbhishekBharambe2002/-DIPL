import {
  LayoutGrid,
  FolderKanban,
  MapPin,
  MapPinCheck,
  ListTodo,
  Package,
  Boxes,
  Tags,
  Warehouse,
  ArrowLeftRight,
  Store,
  Wrench,
  Users,
  Building2,
  BarChart3,
  FileBox,
  UserCog,
  Shield,
  ScrollText,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "./permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    label: "Operate",
    items: [
      { label: "Control room", href: "/app", icon: LayoutGrid, permission: "dashboard.view" },
      { label: "Site tracking", href: "/site-tracking", icon: MapPinCheck, permission: "site.visit" },
      { label: "Tasks", href: "/tasks", icon: ListTodo, permission: "task.view" },
      { label: "Service requests", href: "/service", icon: Wrench, permission: "service.view" },
    ],
  },
  {
    label: "See",
    items: [
      { label: "Projects", href: "/projects", icon: FolderKanban, permission: "project.view" },
      { label: "Sites", href: "/sites", icon: MapPin, permission: "site.view" },
      { label: "Inventory", href: "/inventory", icon: Package, permission: "inventory.view" },
      { label: "Reports", href: "/reports", icon: BarChart3, permission: "report.view" },
    ],
  },
  {
    label: "Records",
    items: [
      { label: "Stock ledger", href: "/inventory/stock-movements", icon: ArrowLeftRight, permission: "inventory.view" },
      { label: "SKU master", href: "/inventory/products", icon: Boxes, permission: "product.view" },
      { label: "Categories", href: "/inventory/categories", icon: Tags, permission: "product.view" },
      { label: "Warehouses", href: "/inventory/warehouses", icon: Warehouse, permission: "warehouse.view" },
      { label: "Documents", href: "/documents", icon: FileBox, permission: "document.view" },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Customers", href: "/customers", icon: Building2, permission: "customer.view" },
      { label: "Vendors", href: "/vendors", icon: Store, permission: "vendor.view" },
      { label: "Team", href: "/team", icon: Users, permission: "employee.view" },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Users", href: "/admin/users", icon: UserCog, permission: "user.view" },
      { label: "Roles & permissions", href: "/admin/roles", icon: Shield, permission: "role.view" },
      { label: "Audit trail", href: "/admin/audit-logs", icon: ScrollText, permission: "audit.view" },
      { label: "Settings", href: "/admin/settings", icon: Settings, permission: "settings.view" },
    ],
  },
];
