import React from "react";
import {
  Building2,
  Package,
  ShoppingBag,
  PiggyBank,
  Bell,
  Users,
  Shield,
  Palette,
  Database,
  Info,
  type LucideIcon,
} from "lucide-react";

export type SettingsCategory =
  | "profile"
  | "inventory"
  | "sales"
  | "finance"
  | "notifications"
  | "team"
  | "security"
  | "appearance"
  | "data"
  | "about";

export interface CategoryMeta {
  id: SettingsCategory;
  name: string;
  shortDesc: string;
  icon: LucideIcon;
  ownerOnly: boolean;
  badge?: string;
}

export const SETTINGS_CATEGORIES: CategoryMeta[] = [
  {
    id: "profile",
    name: "Business Profile",
    shortDesc: "Store name, contact info, physical address, and owner details",
    icon: Building2,
    ownerOnly: true,
  },
  {
    id: "inventory",
    name: "Products & Inventory",
    shortDesc: "Low stock alert levels, stock triggers, and sell-out thresholds",
    icon: Package,
    ownerOnly: true,
  },
  {
    id: "sales",
    name: "Sales & Customers",
    shortDesc: "POS default tender, client dormancy rules, and debt schedules",
    icon: ShoppingBag,
    ownerOnly: false,
  },
  {
    id: "finance",
    name: "Finance & Allocations",
    shortDesc: "Operating currency, large expense alert, and savings policy",
    icon: PiggyBank,
    ownerOnly: true,
  },
  {
    id: "notifications",
    name: "Notifications & Reminders",
    shortDesc: "Push notifications, alert channels, quiet hours, and logs",
    icon: Bell,
    ownerOnly: false,
    badge: "Web Push",
  },
  {
    id: "team",
    name: "Team & Access",
    shortDesc: "Worker accounts, invitations, active status, and permissions",
    icon: Users,
    ownerOnly: true,
  },
  {
    id: "security",
    name: "Security & Sessions",
    shortDesc: "Account credentials, active device sessions, and sign-out",
    icon: Shield,
    ownerOnly: false,
  },
  {
    id: "appearance",
    name: "Appearance & Theme",
    shortDesc: "Interface color mode (Light, Dark, System) and view options",
    icon: Palette,
    ownerOnly: false,
  },
  {
    id: "data",
    name: "Data & Maintenance",
    shortDesc: "CSV exports, database resilience status, and audit logs",
    icon: Database,
    ownerOnly: true,
  },
  {
    id: "about",
    name: "About Avencia",
    shortDesc: "Version 2.0.0, architecture specs, and system diagnostics",
    icon: Info,
    ownerOnly: false,
  },
];
