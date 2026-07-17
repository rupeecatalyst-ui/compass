import {
  EUM_PERMISSION_MODULES,
  EUM_SENSITIVE_MODULES,
  fullAdminPermissionMatrix,
  defaultPermissionMatrix,
} from "@/constants/enterprise-user-management";
import type {
  RpePermissionMatrixRow,
  RpePermissionTemplate,
  RpePlatformAccess,
  RpeRoleDefinition,
  RpeUserType,
} from "@/types/roles-permissions-engine";

export const RPE_STORAGE_KEY = "catalyst.roles-permissions-engine.v1";

export const RPE_USER_TYPE_LABELS: Record<RpeUserType, string> = {
  normal_employee: "Normal Employee",
  hybrid_employee: "Hybrid Employee",
};

export const RPE_PLATFORM_ACCESS_LABELS: Record<RpePlatformAccess, string> = {
  catalyst_one: "Catalyst One",
  compass: "COMPASS",
  both: "Both",
};

export const RPE_PERMISSION_MODULES = EUM_PERMISSION_MODULES;
export const RPE_SENSITIVE_MODULES = EUM_SENSITIVE_MODULES;

export function emptyPermissionMatrix(): RpePermissionMatrixRow[] {
  return defaultPermissionMatrix();
}

export function normalizePermissionMatrix(
  rows: RpePermissionMatrixRow[],
): RpePermissionMatrixRow[] {
  return RPE_PERMISSION_MODULES.map((m) => {
    const existing = rows.find((r) => r.moduleId === m.id);
    return existing
      ? { ...existing, moduleId: m.id }
      : { moduleId: m.id, view: false, createEdit: false, admin: false };
  });
}

export function clonePermissionMatrix(
  rows: RpePermissionMatrixRow[],
): RpePermissionMatrixRow[] {
  return normalizePermissionMatrix(rows);
}

export function matrixTouchesSensitiveAdmin(rows: RpePermissionMatrixRow[]): string[] {
  return rows
    .filter(
      (r) =>
        r.admin &&
        (RPE_SENSITIVE_MODULES as readonly string[]).includes(r.moduleId),
    )
    .map((r) => {
      const mod = RPE_PERMISSION_MODULES.find((m) => m.id === r.moduleId);
      return mod?.label ?? r.moduleId;
    });
}

function seedRole(
  partial: Omit<RpeRoleDefinition, "extensions" | "createdAt" | "updatedAt" | "createdBy"> & {
    createdAt?: string;
  },
): RpeRoleDefinition {
  const at = partial.createdAt ?? "2024-01-15T09:00:00.000Z";
  return {
    ...partial,
    createdAt: at,
    updatedAt: at,
    createdBy: "system",
    extensions: {},
  };
}

export const RPE_SEED_ROLES: RpeRoleDefinition[] = [
  seedRole({
    id: "role_super_admin",
    code: "SUPER_ADMIN",
    name: "Super Admin",
    description: "Full platform governance — protected last-active holder rule applies.",
    status: "active",
    permissions: fullAdminPermissionMatrix(),
    platformAccess: "both",
    defaultUserType: "hybrid_employee",
    isSystem: true,
    isSuperAdminRole: true,
  }),
  seedRole({
    id: "role_admin",
    code: "ADMIN",
    name: "Admin",
    description: "Administrative access across core Catalyst One modules.",
    status: "active",
    permissions: defaultPermissionMatrix({
      dashboard: { view: true, createEdit: true, admin: true },
      directory: { view: true, createEdit: true, admin: true },
      loan_workspace: { view: true, createEdit: true, admin: true },
      user_management: { view: true, createEdit: true },
      organization: { view: true, createEdit: true },
      settings: { view: true, createEdit: true },
    }),
    platformAccess: "catalyst_one",
    defaultUserType: "normal_employee",
    isSystem: true,
    isSuperAdminRole: false,
  }),
  seedRole({
    id: "role_rm",
    code: "RELATIONSHIP_MANAGER",
    name: "Relationship Manager",
    description: "Origination and customer relationship execution.",
    status: "active",
    permissions: defaultPermissionMatrix({
      dashboard: { view: true },
      directory: { view: true, createEdit: true },
      opportunity_workspace: { view: true, createEdit: true },
      strategic_workspace: { view: true, createEdit: true },
      loan_workspace: { view: true, createEdit: true },
      loan_documents: { view: true, createEdit: true },
      tasks: { view: true, createEdit: true },
      lenders: { view: true },
    }),
    platformAccess: "catalyst_one",
    defaultUserType: "normal_employee",
    isSystem: false,
    isSuperAdminRole: false,
  }),
  seedRole({
    id: "role_credit",
    code: "CREDIT_MANAGER",
    name: "Credit Manager",
    description: "Credit verification and risk review.",
    status: "active",
    permissions: defaultPermissionMatrix({
      dashboard: { view: true },
      credit_workbench: { view: true, createEdit: true, admin: true },
      loan_documents: { view: true, createEdit: true },
      loan_workspace: { view: true },
      credit_risk_engine: { view: true },
    }),
    platformAccess: "catalyst_one",
    defaultUserType: "normal_employee",
    isSystem: false,
    isSuperAdminRole: false,
  }),
  seedRole({
    id: "role_ops",
    code: "OPERATIONS",
    name: "Operations",
    description: "Operations processing and document handling.",
    status: "active",
    permissions: defaultPermissionMatrix({
      dashboard: { view: true },
      loan_workspace: { view: true, createEdit: true },
      loan_documents: { view: true, createEdit: true },
      tasks: { view: true, createEdit: true },
    }),
    platformAccess: "catalyst_one",
    defaultUserType: "normal_employee",
    isSystem: false,
    isSuperAdminRole: false,
  }),
  seedRole({
    id: "role_accounts",
    code: "ACCOUNTS",
    name: "Accounts",
    description: "Accounting and financial operations.",
    status: "active",
    permissions: defaultPermissionMatrix({
      dashboard: { view: true },
      accounting: { view: true, createEdit: true, admin: true },
      enterprise_intelligence: { view: true },
    }),
    platformAccess: "both",
    defaultUserType: "normal_employee",
    isSystem: false,
    isSuperAdminRole: false,
  }),
  seedRole({
    id: "role_branch_mgr",
    code: "BRANCH_MANAGER",
    name: "Branch Manager",
    description: "Branch oversight and team management.",
    status: "active",
    permissions: defaultPermissionMatrix({
      dashboard: { view: true, createEdit: true },
      directory: { view: true, createEdit: true },
      loan_workspace: { view: true, createEdit: true, admin: true },
      strategic_workspace: { view: true, createEdit: true },
      tasks: { view: true, createEdit: true, admin: true },
      enterprise_intelligence: { view: true },
    }),
    platformAccess: "catalyst_one",
    defaultUserType: "hybrid_employee",
    isSystem: false,
    isSuperAdminRole: false,
  }),
  seedRole({
    id: "role_management",
    code: "MANAGEMENT",
    name: "Management",
    description: "Executive oversight across domains.",
    status: "active",
    permissions: defaultPermissionMatrix({
      dashboard: { view: true, createEdit: true, admin: true },
      enterprise_intelligence: { view: true, createEdit: true },
      mission_control: { view: true },
      loan_workspace: { view: true },
      accounting: { view: true },
    }),
    platformAccess: "both",
    defaultUserType: "hybrid_employee",
    isSystem: false,
    isSuperAdminRole: false,
  }),
];

export const RPE_SEED_TEMPLATES: RpePermissionTemplate[] = RPE_SEED_ROLES.filter(
  (r) => !r.isSuperAdminRole,
).map((r) => ({
  id: `tpl_${r.code.toLowerCase()}`,
  name: `${r.name} Template`,
  description: `Reusable permission set based on ${r.name}.`,
  permissions: clonePermissionMatrix(r.permissions),
  platformAccess: r.platformAccess,
  defaultUserType: r.defaultUserType,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  createdBy: "system",
}));
