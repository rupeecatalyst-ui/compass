/**
 * CO-WP-ACCESS-001 — Partner Access & Entitlements types.
 */
import type {
  PartnerEntitlementAction,
  PartnerExecutionMode,
  PartnerModuleVisibilityMap,
  PartnerPermissionMap,
} from "@/constants/enterprise-partner-entitlements";

export type PartnerEntitlementEntityKind = "opportunity" | "deal";

export interface PartnerEntitlementTemplateDto {
  id: string;
  organizationId: string;
  code: string;
  label: string;
  description: string;
  executionMode: PartnerExecutionMode;
  permissions: PartnerPermissionMap;
  modules: PartnerModuleVisibilityMap;
  isSystem: boolean;
  versionNumber: number;
  enabled: boolean;
  updatedAt: string;
}

export interface PartnerEntitlementProfileDto {
  id: string;
  organizationId: string;
  wealthPartnerId: string;
  templateId: string | null;
  templateCode: string | null;
  defaultExecutionMode: PartnerExecutionMode;
  permissions: PartnerPermissionMap;
  modules: PartnerModuleVisibilityMap;
  notes: string | null;
  versionNumber: number;
  updatedAt: string;
}

export interface PartnerTransactionEntitlementDto {
  id: string;
  organizationId: string;
  wealthPartnerId: string;
  entityKind: PartnerEntitlementEntityKind;
  entityId: string;
  executionMode: PartnerExecutionMode;
  permissions: PartnerPermissionMap;
  reason: string | null;
  versionNumber: number;
  updatedAt: string;
}

export interface PartnerEffectiveEntitlements {
  wealthPartnerId: string;
  organizationId: string;
  executionMode: PartnerExecutionMode;
  source: "template" | "partner_profile" | "transaction_override";
  permissions: PartnerPermissionMap;
  modules: PartnerModuleVisibilityMap;
  templateCode: string | null;
  entityKind: PartnerEntitlementEntityKind | null;
  entityId: string | null;
  resolvedAt: string;
}

export interface PartnerEntitlementAuditEntry {
  id: string;
  wealthPartnerId: string;
  changeType: string;
  previousValue: unknown;
  newValue: unknown;
  reason: string | null;
  actorUserId: string;
  createdAt: string;
}

export type { PartnerEntitlementAction, PartnerExecutionMode, PartnerPermissionMap };
