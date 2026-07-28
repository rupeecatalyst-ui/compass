/**
 * Opportunity Workspace context helpers — Registry SSOT.
 * Never assign Opportunity UUID to fileId.
 * CO-ARCH-002 — also binds Enterprise Session Opportunity.
 * CO-DOM-001A — borrower may be Contact or Company.
 */

import {
  setActiveOpportunityContext,
  type ActiveOpportunityContext,
} from "@/lib/lead-opportunity-journey/active-context";
import { cacheOpportunityRecord } from "@/lib/lead-opportunity-journey/opportunity-runtime-adapter";
import { bindSessionOpportunity } from "@/lib/enterprise-session";
import { resolveOpportunityBorrowerIdentity } from "@/lib/enterprise-borrower-identity";
import type { EnterpriseOpportunityApiRecord } from "@/lib/enterprise-opportunity/opportunity-api-client";

export function legacyFileIdFromOpportunity(
  opportunity: Pick<EnterpriseOpportunityApiRecord, "legacyLoanFileId">,
): string | undefined {
  const id = opportunity.legacyLoanFileId?.trim();
  return id || undefined;
}

function ownerFromOpportunity(
  opportunity: Pick<
    EnterpriseOpportunityApiRecord,
    "relationshipManagerName" | "primaryOwnerUserId"
  >,
): string | undefined {
  return (
    opportunity.relationshipManagerName?.trim() ||
    opportunity.primaryOwnerUserId?.trim() ||
    undefined
  );
}

function stageFromOpportunity(
  opportunity: Pick<
    EnterpriseOpportunityApiRecord,
    "requirementStage" | "lifecycleStatus"
  >,
): string | undefined {
  return (
    opportunity.requirementStage?.trim() ||
    opportunity.lifecycleStatus?.trim() ||
    undefined
  );
}

/** Build shared Opportunity Context from Registry record. */
export function opportunityContextFromRegistry(
  opportunity: EnterpriseOpportunityApiRecord,
): ActiveOpportunityContext {
  const fileId = legacyFileIdFromOpportunity(opportunity);
  const borrower = resolveOpportunityBorrowerIdentity(opportunity);
  const customerName = borrower.displayName || undefined;
  return {
    opportunityId: opportunity.id,
    opportunityReference: opportunity.opportunityNumber,
    contactId: borrower.primaryContactId,
    companyId: borrower.companyId,
    primaryBorrowerKind: borrower.kind,
    partyId: borrower.partyId || undefined,
    customer: customerName,
    product:
      opportunity.productLabel?.trim() ||
      opportunity.productFamily?.trim() ||
      undefined,
    stage: stageFromOpportunity(opportunity),
    owner: ownerFromOpportunity(opportunity),
    ...(fileId ? { fileId } : {}),
    customerName,
    label: opportunity.opportunityNumber,
  };
}

/** Persist active Opportunity context from Registry record. */
export function rememberOpportunityRegistryContext(
  opportunity: EnterpriseOpportunityApiRecord,
): ActiveOpportunityContext {
  cacheOpportunityRecord(opportunity);
  bindSessionOpportunity(opportunity);
  const ctx = opportunityContextFromRegistry(opportunity);
  setActiveOpportunityContext(ctx);
  return ctx;
}

/** Persist from Opportunity Registry list row. */
export function rememberOpportunityRegistryRowContext(row: {
  id: string;
  opportunityNumber: string;
  legacyLoanFileId?: string | null;
  customerName?: string;
  product?: string;
  primaryContactId?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  primaryBorrowerKind?: string | null;
  opportunityStage?: string;
  owner?: string;
}): ActiveOpportunityContext {
  const fileId = row.legacyLoanFileId?.trim() || undefined;
  const borrower = resolveOpportunityBorrowerIdentity({
    primaryBorrowerKind: row.primaryBorrowerKind,
    companyId: row.companyId,
    companyName: row.companyName ?? row.customerName,
    primaryContactId: row.primaryContactId,
    primaryContactName:
      row.primaryBorrowerKind === "company"
        ? undefined
        : row.customerName,
  });
  const customerName =
    borrower.displayName ||
    (row.customerName && row.customerName !== "—" ? row.customerName : undefined);
  const ctx: ActiveOpportunityContext = {
    opportunityId: row.id,
    opportunityReference: row.opportunityNumber,
    contactId: borrower.primaryContactId,
    companyId: borrower.companyId,
    primaryBorrowerKind: borrower.kind,
    partyId: borrower.partyId || undefined,
    customer: customerName,
    product: row.product,
    stage: row.opportunityStage,
    owner: row.owner && row.owner !== "—" ? row.owner : undefined,
    ...(fileId ? { fileId } : {}),
    customerName,
    label: row.opportunityNumber,
  };
  setActiveOpportunityContext(ctx);
  return ctx;
}
