/**
 * CO-C1-EMPLOYEE-PWA-001
 * Catalyst One employee/user PWA — operational companion, not Wealth Partner,
 * not COMPASS customer PWA, and not a second administration OS.
 */

import { ROLES, type Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { LENDER_CASE_STAGES } from "@/constants/lender-pipeline";

export const EMPLOYEE_PWA_SPRINT = "CO-C1-EMPLOYEE-PWA-001" as const;

export const EMPLOYEE_PWA_NAME = "Catalyst One" as const;
export const EMPLOYEE_PWA_SHORT_NAME = "Catalyst One" as const;
export const EMPLOYEE_PWA_DESCRIPTION =
  "Rupee Catalyst Catalyst One — employee operational companion." as const;

export const EMPLOYEE_PWA_START_PATH = "/pwa" as const;
export const EMPLOYEE_PWA_SCOPE = "/pwa/" as const;
export const EMPLOYEE_PWA_MANIFEST_PATH = "/pwa/manifest.webmanifest" as const;
export const EMPLOYEE_PWA_SW_PATH = "/pwa/sw.js" as const;
export const EMPLOYEE_PWA_OFFLINE_PATH = "/pwa/offline.html" as const;
export const EMPLOYEE_PWA_SW_CACHE_NAME = "catalyst-one-employee-pwa-shell-v1" as const;

export const EMPLOYEE_PWA_ICON_192 = "/icon-192.png" as const;
export const EMPLOYEE_PWA_ICON_512 = "/icon-512.png" as const;
export const EMPLOYEE_PWA_APPLE_TOUCH_ICON = "/apple-touch-icon.png" as const;

export const EMPLOYEE_PWA_THEME_COLOR_LIGHT = "#f8fafc" as const;
export const EMPLOYEE_PWA_THEME_COLOR_DARK = "#0f1f3d" as const;

export const EMPLOYEE_PWA_THEME_MODES = ["light", "dark", "system"] as const;
export type EmployeePwaThemeMode = (typeof EMPLOYEE_PWA_THEME_MODES)[number];

/** Canonical Lead registry objects are not a separate SSOT — Dialogue Opportunity is used. */
export const EMPLOYEE_PWA_CANONICAL_LEAD_OBJECTS_EXIST = false as const;

export const EMPLOYEE_PWA_LIST_ORDER = {
  field: "createdAt",
  direction: "DESC",
  opportunityQuery: "orderBy=createdAt",
  dealQuery: "sort=createdAt_desc",
} as const;

export const EMPLOYEE_PWA_FORBIDDEN_ADMIN_HREFS = [
  ROUTES.ADMIN,
  "/admin",
  "/organization",
  ROUTES.ADMIN_PRODUCTION_RESET,
  ROUTES.ADMIN_SYSTEM_MODES,
  ROUTES.ADMIN_ECG,
  ROUTES.ADMIN_CREDIT_RISK_ENGINE,
  ROUTES.ADMIN_PRODUCT_PROGRAMS,
  ROUTES.ADMIN_LENDER_REGISTRY,
  ROUTES.ADMIN_ENTERPRISE_MDM,
] as const;

export const EMPLOYEE_PWA_MISSION_CONTROL_ROLES: Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
];

export const EMPLOYEE_PWA_REPORT_ROLES: Role[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

export const EMPLOYEE_PWA_CREATE_ACTIONS = [
  { id: "contact", label: "Contact", href: "/pwa/create/contact" },
  { id: "opportunity", label: "Opportunity", href: "/pwa/create/opportunity" },
  { id: "task", label: "Task", href: "/pwa/create/task" },
] as const;

export const EMPLOYEE_PWA_WORK_MODULES = [
  { id: "contacts", label: "Contacts", href: "/pwa/work/contacts", roles: [] as Role[] },
  { id: "opportunities", label: "Opportunities", href: "/pwa/work/opportunities", roles: [] as Role[] },
  { id: "deals", label: "Loan Deals", href: "/pwa/work/deals", roles: [] as Role[] },
  { id: "tasks", label: "Tasks", href: "/pwa/work/tasks", roles: [] as Role[] },
  { id: "activity", label: "Activity & Dialogue", href: "/pwa/work/activity", roles: [] as Role[] },
  { id: "documents", label: "Documents", href: "/pwa/work/documents", roles: [] as Role[] },
  { id: "dashboards", label: "Dashboards", href: "/pwa/work/dashboards", roles: [] as Role[] },
  { id: "radar", label: "CHANAKYA Radar", href: "/pwa/chanakya/radar", roles: [] as Role[] },
  { id: "reports", label: "Reports", href: "/pwa/work/reports", roles: EMPLOYEE_PWA_REPORT_ROLES },
  {
    id: "mission-control",
    label: "Mission Control",
    href: "/pwa/work/mission-control",
    roles: EMPLOYEE_PWA_MISSION_CONTROL_ROLES,
  },
] as const;

export const EMPLOYEE_PWA_DESKTOP_DOCUMENT_WORKSPACE = ROUTES.DOCUMENT_WORKSPACE;

export const EMPLOYEE_PWA_DOCUMENT_ADMIN_REQUIRED =
  "Document administration (add, replace, delete) is available on desktop Document Workspace." as const;

export const EMPLOYEE_PWA_OFFLINE_MUTATION_BLOCKED =
  "You are offline. Catalyst One has not saved this change." as const;

export const EMPLOYEE_PWA_PUSH_DISABLED_MESSAGE =
  "Remote web push is not configured. In-app notifications remain available." as const;

export const EMPLOYEE_PWA_NO_LIVE_LENDER_RECOMMENDATION =
  "Live lender recommendations from incomplete programmes are not available." as const;

export const EMPLOYEE_PWA_IOS_INSTALL_GUIDANCE =
  "On iPhone or iPad, open Safari, tap Share, then Add to Home Screen." as const;

export const EMPLOYEE_PWA_HUMAN_DEAL_STAGES = LENDER_CASE_STAGES.filter(
  (stage) => stage.id !== "post_disbursement_confirmation",
);

export const EMPLOYEE_PWA_SHARED_PRODUCT_METADATA_SOURCE =
  "/api/product-registry/products?presentation=canonical" as const;
