/**
 * CO-GOV-001 — Administrative governance → Enterprise Decision Ledger.
 */

import { recordEnterpriseDecision } from "@/lib/enterprise-decision-ledger";
import type { EdlChangeCategory, EdlChangeType, EdlImpactScope } from "@/types/enterprise-decision-ledger";
import type { GovernanceEntityType } from "@/types/enterprise-governance";
import { recordEntityChange } from "./record";

export type RecordAdminGovernanceInput = {
  actorUserId: string;
  actorName?: string;
  category: EdlChangeCategory;
  changeType?: EdlChangeType;
  impactScope?: EdlImpactScope;
  entityType?: GovernanceEntityType | string;
  entityId?: string;
  entityLabel?: string;
  previousValue?: unknown;
  newValue?: unknown;
  justification?: string;
  versionNumber?: string;
  relatedEngine?: string;
};

/**
 * Record an administrative action in EDL + governance entity history.
 * Safe to call from client stores (RPE) — never throws to callers.
 */
export function recordAdminGovernanceAction(
  input: RecordAdminGovernanceInput,
): string | null {
  try {
    const now = new Date().toISOString();
    const justification =
      input.justification?.trim() ||
      `Administrative change recorded by ${input.actorName ?? input.actorUserId} via governance layer.`;
    const entry = recordEnterpriseDecision({
      requestedBy: input.actorUserId,
      approvedBy: input.actorUserId,
      implementedBy: input.actorUserId,
      previousValue: input.previousValue ?? null,
      newValue: input.newValue ?? null,
      businessJustification: justification.length >= 8 ? justification : `${justification} (governance)`,
      effectiveFrom: now,
      versionNumber: input.versionNumber ?? "1",
      impactScope: input.impactScope ?? "role",
      changeType: input.changeType ?? "updated",
      changeCategory: input.category,
      relatedEngine: input.relatedEngine ?? "Enterprise Governance",
      relatedEntityType: input.entityType,
      relatedEntityId: input.entityId,
      relatedEntityLabel: input.entityLabel,
    });

    if (input.entityId && input.entityType) {
      recordEntityChange({
        entityType: input.entityType as GovernanceEntityType,
        entityId: input.entityId,
        action: input.changeType === "created" ? "Created" : "Updated",
        actorUserId: input.actorUserId,
        summary: `${input.category} · ${input.entityLabel ?? input.entityId}`,
        previousValue: input.previousValue,
        newValue: input.newValue,
        reason: justification,
      });
    }
    return entry.ledgerId;
  } catch {
    return null;
  }
}
