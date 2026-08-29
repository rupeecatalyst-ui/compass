/**
 * COMPASS first-submission operational handoff — delegates to existing Catalyst One services.
 * Idempotent via snapshot.compassOperationalHandoffAt.
 */
import { generateTasksForBusinessEvent } from "@/lib/enterprise-task-engine/auto-generation";
import { EAR_SOURCE_SYSTEMS } from "@/constants/enterprise-activity-registry";
import { emitOpportunityLifecycleToEarBestEffort } from "@server/services/enterprise-activity/opportunity-lifecycle-ear";
import { enterpriseActivityService } from "@server/services/enterprise-activity/enterprise-activity.service";
import { enterpriseNotificationService } from "@server/services/enterprise-notification/enterprise-notification.service";
import { eneEventTitle } from "@/constants/enterprise-notification-engine";

export const COMPASS_OPERATIONAL_HANDOFF_SNAPSHOT_KEY = "compassOperationalHandoffAt";

type HandoffOpportunity = {
  id: string;
  opportunityNumber: string;
  primaryContactId: string | null;
  primaryContactName: string | null;
  productLabel: string | null;
  requestedAmount: unknown;
};

function formatAmountLabel(amount: unknown): string | null {
  if (amount == null) return null;
  const n =
    typeof amount === "object" && amount !== null && "toNumber" in amount
      ? (amount as { toNumber: () => number }).toNumber()
      : Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `₹${n.toLocaleString("en-IN")}`;
}

export function snapshotHasOperationalHandoff(snapshot: unknown): boolean {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return false;
  return Boolean((snapshot as Record<string, unknown>)[COMPASS_OPERATIONAL_HANDOFF_SNAPSHOT_KEY]);
}

export async function executeCompassFirstSubmissionHandoff(input: {
  organizationId: string;
  opportunity: HandoffOpportunity;
  previousLifecycle: string;
  actorUserId?: string | null;
  skipLifecycleEar?: boolean;
}): Promise<{ emitted: boolean }> {
  const customerName = input.opportunity.primaryContactName || "Customer";
  const product = input.opportunity.productLabel || "Home Loan";
  const amount = formatAmountLabel(input.opportunity.requestedAmount);

  if (!input.skipLifecycleEar) {
    await emitOpportunityLifecycleToEarBestEffort({
      opportunityId: input.opportunity.id,
      action: "lifecycle_changed",
      title: `COMPASS application submitted — ${input.opportunity.opportunityNumber}`,
      fromStatus: input.previousLifecycle,
      toStatus: "requirement_captured",
      actorUserId: input.actorUserId ?? null,
      opportunityNumber: input.opportunity.opportunityNumber,
      contactId: input.opportunity.primaryContactId,
    });
  }

  await enterpriseActivityService.emitBestEffort({
    eventKind: "opportunity",
    sourceSystem: EAR_SOURCE_SYSTEMS.OPPORTUNITY,
    sourceEventId: `compass:${input.opportunity.id}:customer_submitted`,
    title: "Customer submitted application via COMPASS",
    summary: `${customerName} submitted ${product} application ${input.opportunity.opportunityNumber} via COMPASS website.`,
    payload: {
      channel: "website_compass",
      lifecycleFrom: input.previousLifecycle,
      lifecycleTo: "requirement_captured",
    },
    opportunityId: input.opportunity.id,
    contactId: input.opportunity.primaryContactId,
    actorUserId: input.actorUserId ?? null,
    actorName: "COMPASS Customer",
  });

  generateTasksForBusinessEvent({
    event: "opportunity_created",
    entityKind: "Opportunity",
    entityId: input.opportunity.id,
    entityLabel: input.opportunity.opportunityNumber,
    opportunityRef: input.opportunity.opportunityNumber,
    contactId: input.opportunity.primaryContactId ?? undefined,
    assigneeRef: "system:compass-intake",
    createdBy: input.actorUserId ?? "compass-customer-gateway",
    borrowerName: customerName,
    loanProduct: product,
  });

  await enterpriseNotificationService.fanOutBestEffort({
    organizationId: input.organizationId,
    eventType: "OPPORTUNITY_CREATED",
    sourceEventId: `compass-submit:${input.opportunity.id}`,
    sourceSystem: "compass",
    title: eneEventTitle("OPPORTUNITY_CREATED"),
    body: [customerName, product, amount].filter(Boolean).join(" · "),
    description: "Submitted via COMPASS website",
    actorUserId: input.actorUserId ?? null,
    opportunityId: input.opportunity.id,
    contactId: input.opportunity.primaryContactId,
    customerName,
    productLabel: product,
    amountLabel: amount,
    href: `/opportunities?opportunityId=${encodeURIComponent(input.opportunity.id)}`,
  });

  return { emitted: true };
}
