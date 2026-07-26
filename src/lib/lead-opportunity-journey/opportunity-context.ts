/**
 * Opportunity Workspace context helpers — Registry SSOT.
 * Never assign Opportunity UUID to fileId.
 * CO-ARCH-002 — also binds Enterprise Session Opportunity.
 */

import {
  setActiveOpportunityContext,
  type ActiveOpportunityContext,
} from "@/lib/lead-opportunity-journey/active-context";
import { cacheOpportunityRecord } from "@/lib/lead-opportunity-journey/opportunity-runtime-adapter";
import { bindSessionOpportunity } from "@/lib/enterprise-session";
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
  return {
    opportunityId: opportunity.id,
    opportunityReference: opportunity.opportunityNumber,
    contactId: opportunity.primaryContactId,
    customer: opportunity.primaryContactName?.trim() || undefined,
    product:
      opportunity.productLabel?.trim() ||
      opportunity.productFamily?.trim() ||
      undefined,
    stage: stageFromOpportunity(opportunity),
    owner: ownerFromOpportunity(opportunity),
    ...(fileId ? { fileId } : {}),
    customerName: opportunity.primaryContactName?.trim() || undefined,
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
  primaryContactId?: string;
  opportunityStage?: string;
  owner?: string;
}): ActiveOpportunityContext {
  const fileId = row.legacyLoanFileId?.trim() || undefined;
  const ctx: ActiveOpportunityContext = {
    opportunityId: row.id,
    opportunityReference: row.opportunityNumber,
    contactId: row.primaryContactId,
    customer: row.customerName,
    product: row.product,
    stage: row.opportunityStage,
    owner: row.owner && row.owner !== "—" ? row.owner : undefined,
    ...(fileId ? { fileId } : {}),
    customerName: row.customerName,
    label: row.opportunityNumber,
  };
  setActiveOpportunityContext(ctx);
  return ctx;
}
