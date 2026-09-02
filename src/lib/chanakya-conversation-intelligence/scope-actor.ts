/**
 * CO-C1-CHANAKYA-REALTIME-INTELLIGENCE-001
 * Record-level visibility for CHANAKYA enterprise-read (same SSOT as Radar / My Deals).
 */

import {
  actorCanSeeCase,
  hasOrgWideCaseVisibility,
  type CaseVisibilityActor,
  type CaseVisibilitySubject,
} from "@/lib/enterprise-case-visibility";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function str(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s || null;
}

export function actorHasOrgWideChanakyaView(role?: string | null): boolean {
  return hasOrgWideCaseVisibility(role);
}

export function attentionRowToVisibilitySubject(
  row: Record<string, unknown>,
): CaseVisibilitySubject {
  const assigned = asArray(row.assignedUserIds)
    .map((id) => str(id))
    .filter((id): id is string => Boolean(id));
  return {
    primaryOwnerUserId: str(row.primaryOwnerUserId),
    relationshipManagerUserId: str(row.relationshipManagerUserId),
    relationshipManagerName:
      str(row.relationshipManagerName) || str(row.ownerLabel) || str(row.assignedRm),
    assignedUserIds: assigned.length > 0 ? assigned : null,
    assignedUserNames: str(row.ownerLabel) ? [str(row.ownerLabel) as string] : null,
    hierarchyVisibilityUserIds: asArray(row.hierarchyVisibilityUserIds)
      .map((id) => str(id))
      .filter((id): id is string => Boolean(id)),
  };
}

export function actorMaySeeAttentionRow(
  actor: CaseVisibilityActor,
  row: Record<string, unknown>,
  downlineUserIds?: string[] | null,
): boolean {
  if (hasOrgWideCaseVisibility(actor.role)) return true;
  return actorCanSeeCase(actor, attentionRowToVisibilitySubject(row), {
    scope: "my_team",
    downlineUserIds: downlineUserIds ?? (actor.userId ? [actor.userId] : []),
  });
}

function filterRowArray(
  value: unknown,
  actor: CaseVisibilityActor,
  downlineUserIds?: string[] | null,
): unknown {
  if (!Array.isArray(value)) return value;
  return value.filter((item) => {
    const row = asRecord(item);
    if (!row) return false;
    return actorMaySeeAttentionRow(actor, row, downlineUserIds);
  });
}

const LIST_KEYS = [
  "priorityList",
  "needingAttention",
  "inactiveOver5Days",
  "awaitingDocuments",
  "awaitingLenderAction",
  "recentlyDisbursed",
  "attentionRows",
  "rows",
  "topAttention",
  "priorityRows",
  "items",
] as const;

export function scopeTransactionAttentionForActor(
  transactionAttention: Record<string, unknown>,
  actor: CaseVisibilityActor,
  downlineUserIds?: string[] | null,
): Record<string, unknown> {
  if (hasOrgWideCaseVisibility(actor.role)) return transactionAttention;

  const scoped: Record<string, unknown> = { ...transactionAttention };
  const lists = asRecord(transactionAttention.lists);
  if (lists) {
    const nextLists: Record<string, unknown> = { ...lists };
    for (const key of LIST_KEYS) {
      if (key in nextLists) nextLists[key] = filterRowArray(nextLists[key], actor, downlineUserIds);
    }
    scoped.lists = nextLists;
  }
  for (const key of LIST_KEYS) {
    if (key in scoped) scoped[key] = filterRowArray(scoped[key], actor, downlineUserIds);
  }

  const registry = asRecord(transactionAttention.portfolioBusinessRegistry);
  if (registry) {
    const byPartner = asRecord(registry.byWealthPartner) ?? {};
    const nextPartner: Record<string, unknown> = {};
    for (const [partner, rows] of Object.entries(byPartner)) {
      nextPartner[partner] = filterRowArray(rows, actor, downlineUserIds);
    }
    scoped.portfolioBusinessRegistry = {
      ...registry,
      allDeals: filterRowArray(registry.allDeals, actor, downlineUserIds),
      activeDeals: filterRowArray(registry.activeDeals, actor, downlineUserIds),
      inactiveDeals: filterRowArray(registry.inactiveDeals, actor, downlineUserIds),
      byWealthPartner: nextPartner,
    };
  }

  return scoped;
}
