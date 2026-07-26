/**
 * BAT #12 — Opportunity Loan Structure helpers.
 * Participants persist on Opportunity.lendingExtension.participants (existing JSON).
 * Downstream modules read via Opportunity runtime projection → LoanFile.participants.
 */

import type { EnterpriseOpportunityApiRecord } from "@/lib/enterprise-opportunity/opportunity-api-client";
import type { LoanParticipant } from "@/types/loan-participant";
import type { EcmContact } from "@/types/enterprise-contact-master";

export function readLendingExtensionRecord(
  lendingExtension: unknown,
): Record<string, unknown> {
  if (
    lendingExtension &&
    typeof lendingExtension === "object" &&
    !Array.isArray(lendingExtension)
  ) {
    return { ...(lendingExtension as Record<string, unknown>) };
  }
  return {};
}

export function readOpportunityParticipantsFromExtension(
  lendingExtension: unknown,
): LoanParticipant[] {
  const ext = readLendingExtensionRecord(lendingExtension);
  const raw = ext.participants;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is LoanParticipant => {
      if (!row || typeof row !== "object") return false;
      const p = row as Partial<LoanParticipant>;
      return Boolean(p.id && p.entityId && p.name);
    })
    .map((p) => ({ ...p, status: p.status ?? "active" }));
}

/** Ensure primary contact is present as Primary Applicant; merge stored structure. */
export function resolveOpportunityLoanStructureParticipants(
  opp: EnterpriseOpportunityApiRecord,
  contact?: EcmContact | null,
): LoanParticipant[] {
  const stored = readOpportunityParticipantsFromExtension(opp.lendingExtension);
  const customerName =
    opp.primaryContactName?.trim() || contact?.name?.trim() || "";
  const primaryId = `opp-primary-${opp.primaryContactId}`;

  if (!customerName && stored.length === 0) return [];

  const withoutStalePrimary = stored.filter((p) => {
    if (p.role !== "primary_applicant") return true;
    return p.entityId === opp.primaryContactId;
  });

  const hasPrimary = withoutStalePrimary.some(
    (p) =>
      p.role === "primary_applicant" &&
      p.status !== "inactive" &&
      p.entityId === opp.primaryContactId,
  );

  if (hasPrimary || !customerName) {
    return withoutStalePrimary;
  }

  const priorOwnerFlag = withoutStalePrimary.find(
    (p) => p.entityId === opp.primaryContactId,
  )?.isPropertyOwner;

  const primary: LoanParticipant = {
    id: primaryId,
    entityType: "individual",
    entityId: opp.primaryContactId,
    name: customerName,
    mobile:
      opp.primaryContactMobile?.trim() || contact?.mobilePrimary?.trim() || undefined,
    email:
      opp.primaryContactEmail?.trim() ||
      contact?.personalEmail?.trim() ||
      contact?.officialEmail?.trim() ||
      undefined,
    role: "primary_applicant",
    status: "active",
    isPropertyOwner: priorOwnerFlag,
  };

  const rest = withoutStalePrimary.filter((p) => p.entityId !== opp.primaryContactId);
  return [primary, ...rest];
}

export function buildLendingExtensionWithParticipants(
  existingExtension: unknown,
  participants: LoanParticipant[],
): Record<string, unknown> {
  return {
    ...readLendingExtensionRecord(existingExtension),
    participants,
  };
}
