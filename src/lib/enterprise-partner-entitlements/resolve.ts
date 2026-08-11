/**
 * CO-WP-ACCESS-001 — Effective permission resolution (pure).
 * Order: template defaults for mode → partner profile → transaction override.
 */

import {
  emptyModuleVisibility,
  emptyPermissionMap,
  PARTNER_ENTITLEMENT_ACTIONS,
  PARTNER_ENTITLEMENT_TEMPLATE_SEEDS,
  type PartnerEntitlementAction,
  type PartnerExecutionMode,
  type PartnerModuleVisibilityMap,
  type PartnerPermissionMap,
} from "@/constants/enterprise-partner-entitlements";
import type { PartnerEffectiveEntitlements } from "@/types/enterprise-partner-entitlements";

export function normalizePermissionMap(
  raw: unknown,
  fallback: PartnerPermissionMap = emptyPermissionMap(false),
): PartnerPermissionMap {
  const src =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const out = { ...fallback };
  for (const key of PARTNER_ENTITLEMENT_ACTIONS) {
    if (typeof src[key] === "boolean") out[key] = src[key];
  }
  return out;
}

export function normalizeModuleVisibility(
  raw: unknown,
  fallback: PartnerModuleVisibilityMap = emptyModuleVisibility(true),
): PartnerModuleVisibilityMap {
  const src =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const out = { ...fallback };
  for (const key of Object.keys(fallback) as Array<keyof PartnerModuleVisibilityMap>) {
    if (typeof src[key] === "boolean") out[key] = src[key];
  }
  return out;
}

export function overlayPermissions(
  base: PartnerPermissionMap,
  overlay: Partial<PartnerPermissionMap> | null | undefined,
): PartnerPermissionMap {
  if (!overlay) return { ...base };
  const next = { ...base };
  for (const key of PARTNER_ENTITLEMENT_ACTIONS) {
    if (typeof overlay[key] === "boolean") next[key] = overlay[key]!;
  }
  return next;
}

export function templateSeedForMode(mode: PartnerExecutionMode) {
  return (
    PARTNER_ENTITLEMENT_TEMPLATE_SEEDS.find((t) => t.executionMode === mode) ??
    PARTNER_ENTITLEMENT_TEMPLATE_SEEDS[0]!
  );
}

export function resolveEffectiveEntitlements(input: {
  wealthPartnerId: string;
  organizationId: string;
  defaultExecutionMode: PartnerExecutionMode;
  templateCode?: string | null;
  partnerPermissions?: Partial<PartnerPermissionMap> | null;
  partnerModules?: Partial<PartnerModuleVisibilityMap> | null;
  transaction?: {
    entityKind: "opportunity" | "deal";
    entityId: string;
    executionMode: PartnerExecutionMode;
    permissions: Partial<PartnerPermissionMap>;
  } | null;
}): PartnerEffectiveEntitlements {
  const mode = input.transaction?.executionMode ?? input.defaultExecutionMode;
  const seed = templateSeedForMode(mode);
  let permissions = { ...seed.permissions };
  let modules = { ...seed.modules };
  let source: PartnerEffectiveEntitlements["source"] = "template";

  if (input.partnerPermissions || input.partnerModules) {
    permissions = overlayPermissions(permissions, input.partnerPermissions);
    modules = {
      ...modules,
      ...(input.partnerModules ?? {}),
    } as PartnerModuleVisibilityMap;
    source = "partner_profile";
  }

  if (input.transaction) {
    const txSeed = templateSeedForMode(input.transaction.executionMode);
    permissions = overlayPermissions(txSeed.permissions, input.partnerPermissions);
    permissions = overlayPermissions(permissions, input.transaction.permissions);
    source = "transaction_override";
  }

  return {
    wealthPartnerId: input.wealthPartnerId,
    organizationId: input.organizationId,
    executionMode: mode,
    source,
    permissions,
    modules,
    templateCode: input.templateCode ?? seed.code,
    entityKind: input.transaction?.entityKind ?? null,
    entityId: input.transaction?.entityId ?? null,
    resolvedAt: new Date().toISOString(),
  };
}

export function hasEntitlement(
  effective: PartnerEffectiveEntitlements,
  action: PartnerEntitlementAction,
): boolean {
  return Boolean(effective.permissions[action]);
}
