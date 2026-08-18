/**
 * CO-C1-EAR-COVERAGE-002 — Opportunity lifecycle → EAR (fail-open).
 * Does not create a second Opportunity activity store.
 */

import type { EmitEnterpriseActivityInput } from "@/types/enterprise-activity-registry";

export type OpportunityLifecycleEarAction =
  | "created"
  | "lifecycle_changed"
  | "converted_to_deal";

export type OpportunityLifecycleEarInput = {
  opportunityId: string;
  action: OpportunityLifecycleEarAction;
  title: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  actorUserId?: string | null;
  opportunityNumber?: string | null;
  contactId?: string | null;
  occurredAt?: Date | string;
};

export function mapOpportunityLifecycleToEarEmit(
  input: OpportunityLifecycleEarInput,
): EmitEnterpriseActivityInput {
  const sourceEventId =
    input.action === "created"
      ? `opportunity:${input.opportunityId}:created`
      : input.action === "converted_to_deal"
        ? `opportunity:${input.opportunityId}:converted_to_deal`
        : `opportunity:${input.opportunityId}:lifecycle:${input.fromStatus ?? ""}:${input.toStatus ?? ""}`;

  return {
    eventKind: input.action === "created" ? "opportunity" : "stage_change",
    sourceSystem: "opportunity",
    sourceEventId,
    title: input.title,
    summary: input.action,
    payload: {
      action: input.action,
      opportunityNumber: input.opportunityNumber ?? null,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
    },
    opportunityId: input.opportunityId,
    contactId: input.contactId ?? null,
    actorUserId: input.actorUserId ?? null,
    occurredAt: input.occurredAt,
  };
}

export async function emitOpportunityLifecycleToEarBestEffort(
  input: OpportunityLifecycleEarInput,
  emit?: (payload: EmitEnterpriseActivityInput) => Promise<unknown>,
): Promise<void> {
  try {
    const mapped = mapOpportunityLifecycleToEarEmit(input);
    if (emit) {
      await emit(mapped);
      return;
    }
    const { enterpriseActivityService } = await import(
      "@server/services/enterprise-activity/enterprise-activity.service"
    );
    await enterpriseActivityService.emitBestEffort(mapped);
  } catch {
    /* fail-open — never block Opportunity workflow */
  }
}
