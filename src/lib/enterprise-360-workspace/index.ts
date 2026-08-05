/**
 * CO-360-001 — Enterprise Universal 360° Workspace Framework (lib SSOT).
 */

export {
  ENTERPRISE_360_FRAMEWORK_VERSION,
  ENTERPRISE_360_MODULE_ID,
  ENTERPRISE_360_PRINCIPLES,
  ENTERPRISE_360_COMMON_SECTIONS,
  ENTERPRISE_360_COMMAND_BAR,
  ENTERPRISE_360_ENTITY_MODULES,
  ENTERPRISE_360_ENTITY_KINDS,
  ENTERPRISE_360_TIMELINE_EVENT_TYPES,
  ENTERPRISE_360_CONTACT_EXTRA_ROLES,
  getEnterprise360Module,
  listEnterprise360Sections,
  buildEnterprise360AdminDemoHref,
} from "@/constants/enterprise-360-workspace";

export {
  composeEnterprise360Workspace,
  composeContactIdentityRoleLinks,
  mapIdentityRoleTo360Kind,
  listEnterprise360FrameworkInventory,
} from "./compose";

export { listEnterprise360DocumentsForIdentity } from "./documents";

export {
  createEnterprise360TimelineEvent,
  createEnterprise360AuditEntry,
} from "./timeline";
