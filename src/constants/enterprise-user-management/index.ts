import type { EnterpriseModulePermission } from "@/types/enterprise-user-management";

export const EUM_STORAGE_KEY = "catalyst.enterprise.user-management.v1";

/** Operational roles — prefer RPE role ids; legacy ids retained for migration. */
export const EUM_OPERATIONAL_ROLES = [
  { id: "role_super_admin", label: "Super Admin", legacyId: "super_admin" },
  { id: "role_admin", label: "Admin", legacyId: "admin" },
  { id: "role_rm", label: "Relationship Manager", legacyId: "relationship_manager" },
  { id: "role_credit", label: "Credit Manager", legacyId: "credit_manager" },
  { id: "role_ops", label: "Operations", legacyId: "operations" },
  { id: "role_accounts", label: "Accounts", legacyId: "accounts" },
  { id: "role_branch_mgr", label: "Branch Manager", legacyId: "branch_manager" },
  { id: "role_management", label: "Management", legacyId: "management" },
] as const;

export const EUM_STATUS_LABELS = {
  active: "Active",
  suspended: "Suspended",
  on_leave: "On Leave",
  resigned: "Resigned",
  archived: "Archived",
} as const;

export const EUM_LOGIN_STATUS_LABELS = {
  pending_invitation: "Pending Invitation",
  active: "Active",
  suspended: "Suspended",
  archived: "Archived",
} as const;

export const EUM_PLATFORM_ACCESS_LABELS = {
  no_access: "No Access",
  catalyst_one: "Catalyst One",
  compass: "COMPASS",
  both: "Both",
} as const;

/** Permission matrix modules — every Catalyst One domain surface. */
export const EUM_PERMISSION_MODULES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "directory", label: "Contacts" },
  { id: "opportunity_workspace", label: "Opportunity Workspace" },
  { id: "strategic_workspace", label: "Strategic Workspace" },
  { id: "credit_workbench", label: "Credit Workbench" },
  { id: "loan_workspace", label: "Loan Workspace" },
  { id: "loan_documents", label: "Loan Documents" },
  { id: "lenders", label: "Lenders" },
  { id: "tasks", label: "Tasks" },
  { id: "dialogue", label: "Dialogue" },
  { id: "accounting", label: "Accounting" },
  { id: "enterprise_intelligence", label: "Enterprise Intelligence" },
  { id: "mission_control", label: "Mission Control" },
  { id: "organization", label: "Organization" },
  { id: "organization_documents", label: "Organization Documents" },
  { id: "product_library", label: "Product Library" },
  { id: "enterprise_assets", label: "Enterprise Asset Library" },
  { id: "credit_risk_engine", label: "Credit & Risk Engine" },
  { id: "workflow_engine", label: "Workflow Engine" },
  { id: "user_management", label: "User Management" },
  { id: "roles_permissions", label: "Roles & Permissions" },
  { id: "ai_administration", label: "AI Administration" },
  { id: "enterprise_settings", label: "Enterprise Settings" },
  { id: "organization_settings", label: "Organization Settings" },
  { id: "settings", label: "Settings" },
] as const;

/** Modules that require explicit confirmation before Admin access is granted. */
export const EUM_SENSITIVE_MODULES = [
  "roles_permissions",
  "mission_control",
  "accounting",
  "ai_administration",
  "enterprise_settings",
  "organization_settings",
  "organization",
  "user_management",
] as const;

export const EUM_BRANCHES = [
  "Mumbai HO",
  "Pune",
  "Bengaluru",
  "Hyderabad",
  "Delhi NCR",
  "Ahmedabad",
] as const;

export const EUM_DEPARTMENTS = [
  "Sales",
  "Credit",
  "Operations",
  "Accounts",
  "Technology",
  "Management",
  "Compliance",
] as const;

export const EUM_TEAMS = [
  "HL Origination",
  "LAP Desk",
  "Credit Desk",
  "Central Ops",
  "Collections",
] as const;

export const EUM_BUSINESS_UNITS = [
  "Home Loans",
  "LAP",
  "SME",
  "Wealth",
] as const;

export const EUM_LANDING_PAGES = [
  { id: "/dashboard", label: "Dashboard" },
  { id: "/contacts", label: "Contacts" },
  { id: "/loan-files", label: "Loan Workspace" },
  { id: "/opportunities", label: "Strategic Workspace" },
  { id: "/reports", label: "Enterprise Intelligence" },
] as const;

export const FROZEN_CERTIFICATION_ADMIN_EMAIL = "admin@compass.com";

export function defaultPermissionMatrix(
  overrides?: Partial<Record<string, Partial<EnterpriseModulePermission>>>,
): EnterpriseModulePermission[] {
  return EUM_PERMISSION_MODULES.map((m) => {
    const o = overrides?.[m.id];
    return {
      moduleId: m.id,
      view: o?.view ?? false,
      createEdit: o?.createEdit ?? false,
      admin: o?.admin ?? false,
    };
  });
}

export function fullAdminPermissionMatrix(): EnterpriseModulePermission[] {
  return EUM_PERMISSION_MODULES.map((m) => ({
    moduleId: m.id,
    view: true,
    createEdit: true,
    admin: true,
  }));
}

export function nextEmployeeId(existing: string[]): string {
  const nums = existing
    .map((id) => {
      const m = /^RC-EMP-(\d+)$/i.exec(id);
      return m ? Number(m[1]) : 0;
    })
    .filter((n) => n > 0);
  const next = (nums.length ? Math.max(...nums) : 1000) + 1;
  return `RC-EMP-${String(next).padStart(4, "0")}`;
}
