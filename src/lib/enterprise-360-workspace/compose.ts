/**
 * CO-360-001 — Universal 360° compose / projection helpers (no new SSOT stores).
 */

import {
  ENTERPRISE_360_CONTACT_EXTRA_ROLES,
  ENTERPRISE_360_FRAMEWORK_VERSION,
  ENTERPRISE_360_PRINCIPLES,
  getEnterprise360Module,
  listEnterprise360Sections,
} from "@/constants/enterprise-360-workspace";
import { ENTERPRISE_IDENTITY_BUSINESS_ROLES } from "@/constants/enterprise-identity-model";
import { buildWealthPartnerWorkspaceHref } from "@/constants/enterprise-wealth-partner-registry";
import { ROUTES } from "@/constants/routes";
import type {
  ComposeEnterprise360Input,
  Enterprise360AiInsight,
  Enterprise360EntityKind,
  Enterprise360IdentityRoleLink,
  Enterprise360WorkspaceSnapshot,
} from "@/types/enterprise-360-workspace";

export function composeEnterprise360Workspace(
  input: ComposeEnterprise360Input,
): Enterprise360WorkspaceSnapshot {
  const moduleDef = getEnterprise360Module(input.entityKind);
  const sections = listEnterprise360Sections(input.entityKind);
  const timeline = input.timeline ?? [];
  const now = new Date().toISOString();

  const dashboard = {
    currentStatus: input.currentStatus?.trim() || "Active",
    pendingActions: input.pendingActions ?? 0,
    openTasks: input.openTasks ?? 0,
    upcomingActivities: input.upcomingActivities ?? 0,
    complianceAlerts: input.complianceAlerts ?? 0,
    documentsPending: input.documentsPending ?? 0,
    recentTimelineCount: timeline.length,
    summaryLine: `${moduleDef.label} · ${input.entityLabel} · Registry SSOT: ${moduleDef.registryLabel}`,
  };

  const aiInsights: Enterprise360AiInsight[] = [
    {
      id: `ai-${input.entityKind}-${input.entityId}`,
      title: `${moduleDef.label} — AI Summary`,
      summary:
        input.aiSummaryOverride?.trim() ||
        `Focus: ${moduleDef.aiInsightFocus}. Advisory only — does not block workflow. Derived from entity-scoped operational signals.`,
      focus: moduleDef.aiInsightFocus,
      generatedAt: now,
    },
  ];

  return {
    frameworkVersion: ENTERPRISE_360_FRAMEWORK_VERSION,
    entityKind: input.entityKind,
    entityId: input.entityId,
    entityLabel: input.entityLabel,
    registryLabel: moduleDef.registryLabel,
    sections,
    commands: [...moduleDef.commands].sort((a, b) => a.order - b.order),
    dashboard,
    aiInsights,
    timeline,
    audit: input.audit ?? [],
    documents: input.documents ?? [],
    identityRoles:
      input.entityKind === "contact"
        ? input.identityRoles ?? composeContactIdentityRoleLinks({ assignedRoleIds: [] })
        : input.identityRoles,
    principles: ENTERPRISE_360_PRINCIPLES,
  };
}

/**
 * Contact 360 — map identity business roles to corresponding 360 Workspaces.
 * Clicking a role opens that entity's operational workspace (when linkable).
 */
export function composeContactIdentityRoleLinks(input: {
  contactId?: string;
  assignedRoleIds: string[];
  wealthPartnerId?: string | null;
}): Enterprise360IdentityRoleLink[] {
  const assigned = new Set(input.assignedRoleIds.map((r) => r.toLowerCase()));
  const fromIdentity = ENTERPRISE_IDENTITY_BUSINESS_ROLES.map((role) => {
    const entityKind = mapIdentityRoleTo360Kind(role.id);
    const workspaceHref = resolveRoleWorkspaceHref({
      roleId: role.id,
      entityKind,
      contactId: input.contactId,
      wealthPartnerId: input.wealthPartnerId,
    });
    return {
      roleId: role.id,
      roleLabel: role.label,
      entityKind,
      workspaceHref,
      assigned:
        assigned.has(role.id.toLowerCase()) ||
        (role.ecmRole ? assigned.has(role.ecmRole.toLowerCase()) : false),
    };
  });
  const extras = ENTERPRISE_360_CONTACT_EXTRA_ROLES.map((role) => ({
    roleId: role.id,
    roleLabel: role.label,
    entityKind: null as Enterprise360EntityKind | null,
    workspaceHref: null as string | null,
    assigned: assigned.has(role.id.toLowerCase()),
  }));
  return [...fromIdentity, ...extras];
}

export function mapIdentityRoleTo360Kind(
  roleId: string,
): Enterprise360EntityKind | null {
  switch (roleId) {
    case "customer":
      return "customer";
    case "wealth_partner":
      return "wealth_partner";
    case "vendor":
      return "vendor";
    case "employee":
      return "employee";
    case "guarantor":
    case "introducer":
    case "lender_contact":
      return "contact";
    default:
      return null;
  }
}

function resolveRoleWorkspaceHref(input: {
  roleId: string;
  entityKind: Enterprise360EntityKind | null;
  contactId?: string;
  wealthPartnerId?: string | null;
}): string | null {
  if (input.roleId === "wealth_partner" && input.wealthPartnerId) {
    return buildWealthPartnerWorkspaceHref(input.wealthPartnerId);
  }
  if (input.entityKind === "customer" && input.contactId) {
    return `${ROUTES.CONTACTS}?contact=${encodeURIComponent(input.contactId)}&view=customer-360`;
  }
  if (input.entityKind === "vendor" && input.contactId) {
    return `${ROUTES.CONTACTS}?contact=${encodeURIComponent(input.contactId)}&view=vendor-360`;
  }
  if (input.entityKind === "employee" && input.contactId) {
    return `${ROUTES.CONTACTS}?contact=${encodeURIComponent(input.contactId)}&view=employee-360`;
  }
  if (input.entityKind === "lender") {
    return ROUTES.LENDERS;
  }
  return null;
}

/** Framework inventory for certification / admin demo. */
export function listEnterprise360FrameworkInventory(): Array<{
  kind: Enterprise360EntityKind;
  label: string;
  sectionCount: number;
  commandCount: number;
  aiFocus: string;
}> {
  const kinds: Enterprise360EntityKind[] = [
    "customer",
    "lender",
    "wealth_partner",
    "vendor",
    "employee",
    "contact",
  ];
  return kinds.map((kind) => {
    const m = getEnterprise360Module(kind);
    return {
      kind,
      label: m.label,
      sectionCount: m.sections.length,
      commandCount: m.commands.length,
      aiFocus: m.aiInsightFocus,
    };
  });
}
