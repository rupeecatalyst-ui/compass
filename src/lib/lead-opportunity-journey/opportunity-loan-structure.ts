/**
 * BAT #12 — Opportunity Loan Structure helpers.
 * Participants persist on Opportunity.lendingExtension.participants (existing JSON).
 * Downstream modules read via Opportunity runtime projection → LoanFile.participants.
 */

import type { EnterpriseOpportunityApiRecord } from "@/lib/enterprise-opportunity/opportunity-api-client";
import { resolveOpportunityBorrowerIdentity } from "@/lib/enterprise-borrower-identity";
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

/** Ensure primary borrower is present; merge stored loan structure participants. */
export function resolveOpportunityLoanStructureParticipants(
  opp: EnterpriseOpportunityApiRecord,
  contact?: EcmContact | null,
): LoanParticipant[] {
  const stored = readOpportunityParticipantsFromExtension(opp.lendingExtension);
  const borrower = resolveOpportunityBorrowerIdentity(opp);
  const isCompanyBorrower = borrower.kind === "company" && Boolean(borrower.companyId);

  if (isCompanyBorrower) {
    const companyName = borrower.displayName || "Not Specified";
    const companyId = borrower.companyId!;
    const primaryId = `opp-company-${companyId}`;
    const withoutStalePrimary = stored.filter((p) => {
      if (p.role !== "primary_applicant") return true;
      return p.entityId === companyId;
    });
    const hasPrimary = withoutStalePrimary.some(
      (p) =>
        p.role === "primary_applicant" &&
        p.status !== "inactive" &&
        p.entityId === companyId,
    );
    if (hasPrimary || companyName === "Not Specified") {
      return withoutStalePrimary;
    }
    const primary: LoanParticipant = {
      id: primaryId,
      entityType: "company",
      entityId: companyId,
      name: companyName,
      role: "primary_applicant",
      status: "active",
    };
    const rest = withoutStalePrimary.filter((p) => p.entityId !== companyId);
    return [primary, ...rest];
  }

  if (!borrower.primaryContactId) {
    return stored;
  }

  const contactId = borrower.primaryContactId;
  const customerName =
    borrower.displayName || contact?.name?.trim() || "";
  const primaryId = `opp-primary-${contactId}`;

  if (!customerName && stored.length === 0) return [];

  const withoutStalePrimary = stored.filter((p) => {
    if (p.role !== "primary_applicant") return true;
    return p.entityId === contactId;
  });

  const hasPrimary = withoutStalePrimary.some(
    (p) =>
      p.role === "primary_applicant" &&
      p.status !== "inactive" &&
      p.entityId === contactId,
  );

  if (hasPrimary || !customerName) {
    return withoutStalePrimary;
  }

  const priorOwnerFlag = withoutStalePrimary.find(
    (p) => p.entityId === contactId,
  )?.isPropertyOwner;

  const primary: LoanParticipant = {
    id: primaryId,
    entityType: "individual",
    entityId: contactId,
    name: customerName,
    mobile:
      borrower.primaryContactMobile ||
      opp.primaryContactMobile?.trim() ||
      contact?.mobilePrimary?.trim() ||
      undefined,
    email:
      borrower.primaryContactEmail ||
      opp.primaryContactEmail?.trim() ||
      contact?.personalEmail?.trim() ||
      contact?.officialEmail?.trim() ||
      undefined,
    role: "primary_applicant",
    status: "active",
    isPropertyOwner: priorOwnerFlag,
  };

  const rest = withoutStalePrimary.filter((p) => p.entityId !== contactId);
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
