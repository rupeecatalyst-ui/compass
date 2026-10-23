/**
 * Queue one transactional application summary after a successful COMPASS submit.
 * Uses the existing customer notification route. A missing sender is recorded
 * and does not undo the submission. Marketing consent is not involved.
 */

import { readCompassSelectedLenders } from "@/lib/compass-customer-gateway/borrower-lender-selection";
import {
  applicationConfirmationBody,
  applicationConfirmationSubject,
  confirmationAttempt,
  confirmationSourceEventId,
  customerAssessmentLines,
  readApplicationConfirmation,
  type ApplicationConfirmationStatus,
} from "@/lib/compass-customer-gateway/application-confirmation";
import type { CompassLodDto } from "@/types/compass-customer-gateway";
import { enterpriseOpportunityRepository } from "@server/repositories/enterprise-opportunity/enterprise-opportunity.repository";
import { dispatchOperationalTransactionEmail } from "@server/services/enterprise-communication-center/operational-email-dispatch.service";

type OpportunityRow = {
  id: string;
  opportunityNumber: string;
  productLabel?: string | null;
  requestedAmount?: unknown;
  primaryContactName?: string | null;
  advantageCommittedAmount?: unknown;
  snapshot?: unknown;
};

function amountText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return `₹${Math.round(value).toLocaleString("en-IN")}`;
  }
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "object" && value && "toString" in value) {
    const text = String(value).trim();
    if (!text || text === "null") return null;
    const numeric = Number(text);
    if (Number.isFinite(numeric)) return `₹${Math.round(numeric).toLocaleString("en-IN")}`;
    return text;
  }
  return null;
}

function snapshotRecord(snapshot: unknown): Record<string, unknown> {
  return snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
    ? { ...(snapshot as Record<string, unknown>) }
    : {};
}

function mapDeliveryStatus(status: string, failureCode: string | null): ApplicationConfirmationStatus {
  if (status === "sent") return "sent";
  if (
    status === "disabled" ||
    failureCode === "OPERATIONAL_DELIVERY_DISABLED" ||
    failureCode === "PROFILE_NOT_READY" ||
    failureCode === "SMTP_NOT_CONFIGURED"
  ) {
    return "pending";
  }
  return "failed";
}

export async function queueCompassApplicationConfirmation(input: {
  organizationId: string;
  opportunity: OpportunityRow;
  lod: CompassLodDto | null;
  submittedAt: string;
}): Promise<"sent" | "skipped" | "pending" | "failed"> {
  const submissionAt = input.submittedAt.trim();
  const base = snapshotRecord(input.opportunity.snapshot);
  if (confirmationAttempt(readApplicationConfirmation(base), submissionAt) === "skip") return "skipped";

  const claimed: Record<string, unknown> = {
    ...base,
    compassSubmittedAt: typeof base.compassSubmittedAt === "string" ? base.compassSubmittedAt : submissionAt,
    compassApplicationConfirmation: { submissionAt, status: "queued" },
  };
  const claimedJson = JSON.parse(JSON.stringify(claimed));
  await enterpriseOpportunityRepository.updateOpportunity(input.organizationId, input.opportunity.id, {
    snapshot: claimedJson,
    updatedBy: "compass-customer-gateway",
  });

  const answers =
    claimed.compassAnswers && typeof claimed.compassAnswers === "object"
      ? (claimed.compassAnswers as Record<string, unknown>)
      : {};
  const lenders = readCompassSelectedLenders(claimed);
  const lender = lenders[0] ?? null;
  const productLabel = input.opportunity.productLabel?.trim() || "application";
  const reference = input.opportunity.opportunityNumber;
  let status: ApplicationConfirmationStatus = "failed";
  try {
    const result = await dispatchOperationalTransactionEmail({
      organizationId: input.organizationId,
      eventType: "customer_notification",
      opportunityId: input.opportunity.id,
      actorUserId: "compass-customer-gateway",
      actorName: "COMPASS",
      initiation: "system",
      sourceEventId: confirmationSourceEventId(input.opportunity.id, submissionAt),
      subject: applicationConfirmationSubject({ productLabel, reference }),
      textBody: applicationConfirmationBody({
        customerName: input.opportunity.primaryContactName?.trim() || "there",
        reference,
        productLabel,
        requestedAmount: amountText(input.opportunity.requestedAmount),
        submittedAt: submissionAt,
        assessment: customerAssessmentLines(answers),
        lenderName: lender?.lenderName ?? null,
        preferenceNames: lenders.length > 1 ? lenders.map((item) => item.lenderName) : null,
        commercials: {
          eligibleOffer: lender?.tentativeOfferLabel ?? null,
          interestRate: lender?.interestRateLabel ?? null,
          emi: lender?.estimatedEmiLabel ?? null,
          tenure: lender?.tenureLabel ?? null,
          processingTime: lender?.processingTimeLabel ?? null,
        },
        advantageAmount: amountText(input.opportunity.advantageCommittedAmount),
        documents: (input.lod?.items ?? []).map((item) => ({
          label: item.label,
          status: item.uploadStatus,
        })),
        documentCompletionPercent: input.lod?.completionPercent ?? null,
        nextSteps:
          "Our team will review your details and contact you with next steps. You can still add any pending documents.",
      }),
      primaryToRole: "customer",
      customerDisplayName: input.opportunity.primaryContactName ?? null,
      opportunityReference: reference,
      sourceSystem: "compass_application_confirmation",
    });
    status = mapDeliveryStatus(result.deliveryStatus, result.failureCode);
  } catch {
    status = "failed";
  }

  await enterpriseOpportunityRepository.updateOpportunity(input.organizationId, input.opportunity.id, {
    snapshot: JSON.parse(JSON.stringify({
      ...claimedJson,
      compassApplicationConfirmation: { submissionAt, status },
    })),
    updatedBy: "compass-customer-gateway",
  }).catch(() => undefined);

  if (status === "sent") return "sent";
  if (status === "pending") return "pending";
  return "failed";
}
