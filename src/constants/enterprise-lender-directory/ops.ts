/** CO-ARCH-ELD-001 — Directory filter / chrome constants. */

import type {
  EldLenderEmployeeStatus,
  EnterpriseLenderDirectoryCategoryId,
} from "@/types/enterprise-lender-directory-ops";

export const ENTERPRISE_LENDER_DIRECTORY_TITLE = "Enterprise Lender Directory";

/** Landing views — Lenders (institutions) · Lender Employees (bankers). */
export const ELD_LANDING_TABS = [
  { id: "lenders", label: "Lenders" },
  { id: "employees", label: "Lender Employees" },
] as const;

export type EldLandingTabId = (typeof ELD_LANDING_TABS)[number]["id"];

export const ELD_CATEGORY_OPTIONS: {
  id: EnterpriseLenderDirectoryCategoryId | "all";
  label: string;
}[] = [
  { id: "all", label: "All categories" },
  { id: "bank", label: "Bank" },
  { id: "hfc", label: "Housing Finance Company (HFC)" },
  { id: "nbfc", label: "NBFC" },
  { id: "fintech", label: "Fintech" },
  { id: "cooperative", label: "Cooperative Bank" },
  { id: "other", label: "Others" },
];

export const ELD_EMPLOYEE_STATUS_OPTIONS: {
  id: EldLenderEmployeeStatus | "all";
  label: string;
}[] = [
  { id: "all", label: "All statuses" },
  { id: "active", label: "Active" },
  { id: "provisional", label: "Provisional" },
  { id: "inactive", label: "Inactive" },
];

export const ELD_EMPLOYEE_PERFORMANCE_FILTER_OPTIONS: {
  id: "all" | "not_specified" | "has_activity";
  label: string;
}[] = [
  { id: "all", label: "All performance" },
  { id: "has_activity", label: "Has pipeline activity" },
  { id: "not_specified", label: "Score not specified" },
];

export const ELD_RECENT_STORAGE_KEY = "c1.eld.recently-used.v1";
export const ELD_PINNED_STORAGE_KEY = "c1.eld.pinned-lenders.v1";

export const ELD_PAGE_SIZES = [25, 50, 100] as const;

export const ELD_WORKSPACE_TABS = [
  { id: "summary", label: "Executive Summary" },
  { id: "products", label: "Product Programmes" },
  { id: "hierarchy", label: "Hierarchy" },
  { id: "contacts", label: "Contacts" },
  { id: "performance", label: "Performance" },
  { id: "opportunities", label: "Opportunities" },
  { id: "documents", label: "Documents" },
  { id: "activity", label: "Activity" },
  { id: "chanakya", label: "Chanakya Insights" },
] as const;

export type EldWorkspaceTabId = (typeof ELD_WORKSPACE_TABS)[number]["id"];

/** Employee slide-over sections (Lender Employees tab). */
export const ELD_EMPLOYEE_WORKSPACE_SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "products", label: "Products" },
  { id: "performance", label: "Performance" },
  { id: "hierarchy", label: "Hierarchy" },
  { id: "pipeline", label: "Current Pipeline" },
  { id: "communication", label: "Communication" },
] as const;

export type EldEmployeeWorkspaceSectionId =
  (typeof ELD_EMPLOYEE_WORKSPACE_SECTIONS)[number]["id"];
