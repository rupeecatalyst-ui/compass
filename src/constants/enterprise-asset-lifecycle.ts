import type {
  EnterpriseAssetLifecycleStatus,
  EnterpriseAssetOperationalStatus,
  EnterpriseAssetType,
} from "@/types/enterprise-asset-library";

export const EAL_LIFECYCLE_ORDER: EnterpriseAssetLifecycleStatus[] = [
  "draft",
  "review",
  "approved",
  "published",
  "deprecated",
  "archived",
];

export const EAL_LIFECYCLE_LABELS: Record<EnterpriseAssetLifecycleStatus, string> = {
  draft: "Draft",
  review: "Review",
  approved: "Approved",
  published: "Published",
  deprecated: "Deprecated",
  archived: "Archived",
};

export const EAL_STATUS_LABELS: Record<EnterpriseAssetOperationalStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  pilot: "Pilot",
  coming_soon: "Coming Soon",
  retired: "Retired",
};

export const EAL_ASSET_TYPE_LABELS: Record<EnterpriseAssetType, string> = {
  DOCUMENT_PACK: "Document Pack",
  CHECKLIST_PACK: "Checklist Pack",
  NOTIFICATION_PACK: "Notification Pack",
  SLA_PACK: "SLA Pack",
  FEE_TEMPLATE: "Fee Template",
  CALCULATOR: "Calculator",
  COMPLIANCE_PACK: "Compliance Pack",
  AI_PROMPT: "AI Prompt",
  API_INTEGRATION: "API Integration",
  UI_EXPERIENCE: "UI Experience",
  CUSTOM: "Custom",
};

export const EAL_ASSET_TYPES: EnterpriseAssetType[] = [
  "DOCUMENT_PACK",
  "CHECKLIST_PACK",
  "NOTIFICATION_PACK",
  "SLA_PACK",
  "FEE_TEMPLATE",
  "CALCULATOR",
  "COMPLIANCE_PACK",
  "AI_PROMPT",
  "API_INTEGRATION",
  "UI_EXPERIENCE",
  "CUSTOM",
];

type PillVariant = "default" | "success" | "warning" | "error" | "info" | "muted";

export const EAL_LIFECYCLE_PILL_VARIANT: Record<EnterpriseAssetLifecycleStatus, PillVariant> = {
  draft: "muted",
  review: "warning",
  approved: "default",
  published: "success",
  deprecated: "warning",
  archived: "muted",
};

export const EAL_STATUS_PILL_VARIANT: Record<EnterpriseAssetOperationalStatus, PillVariant> = {
  active: "success",
  inactive: "muted",
  pilot: "info",
  coming_soon: "warning",
  retired: "muted",
};

export function formatEnterpriseAssetVersion(major: number, minor: number): string {
  return `v${major}.${minor}`;
}

export function isEnterpriseAssetPublished(lifecycle: EnterpriseAssetLifecycleStatus): boolean {
  return lifecycle === "published";
}

export function canTransitionEnterpriseAssetLifecycle(
  from: EnterpriseAssetLifecycleStatus,
  to: EnterpriseAssetLifecycleStatus,
): boolean {
  if (from === to) return true;
  if (from === "archived" || to === "archived") return to === "archived";
  const order = EAL_LIFECYCLE_ORDER;
  const fromIdx = order.indexOf(from);
  const toIdx = order.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return false;
  return toIdx === fromIdx + 1;
}

export const EAL_RESERVED_EXTENSIONS = [
  { id: "document_engine", label: "Document Engine", status: "reserved" as const },
  { id: "notification_engine", label: "Notification Engine", status: "reserved" as const },
  { id: "sla_engine", label: "SLA Engine", status: "reserved" as const },
  { id: "package_manager", label: "Enterprise Package Manager", status: "reserved" as const },
] as const;
