/**
 * CO-DOM-001 / CO-OPP-002 — Start Loan Journey from Company (primary borrower).
 *
 * Company → Start Loan Journey → Dialogue Opportunity (company-owned) → Execution Hub
 * P1: Idempotent — reuse open Dialogue for the Company; never mint a second.
 */
import { rememberOpportunityRegistryContext } from "@/lib/lead-opportunity-journey/opportunity-context";
import {
  enterpriseOpportunityApiClient,
  OpportunityApiError,
  type EnterpriseOpportunityApiRecord,
} from "@/lib/enterprise-opportunity/opportunity-api-client";
import { buildLoanJourneyHref } from "@/lib/loan-journey/adr-018-routing";
import { OPPORTUNITY_PRIMARY_BORROWER_KIND } from "@/constants/opportunity-primary-borrower";
import type { EcmCompany } from "@/types/enterprise-company-master";
import { generateTasksForBusinessEvent } from "@/lib/enterprise-task-engine/auto-generation";
import type {
  ActiveOpportunityConflict,
  StartOpportunityFromContactResult,
} from "@/lib/enterprise-opportunity/start-opportunity-from-contact";
import { openExistingOpportunityWorkspace } from "@/lib/enterprise-opportunity/start-opportunity-from-contact";
import { formatProductDisplayLabel } from "@/constants/opportunity-active-uniqueness";

export type CompanyLoanJourneyReadiness =
  | { ready: true }
  | { ready: false; message: string };

export function assertCompanyReadyForLoanJourney(
  company: Pick<EcmCompany, "id" | "companyName">,
): CompanyLoanJourneyReadiness {
  if (!company.id?.trim()) {
    return { ready: false, message: "Company is missing a registry id." };
  }
  if (!company.companyName?.trim()) {
    return {
      ready: false,
      message: "Company name is required before starting a loan journey.",
    };
  }
  return { ready: true };
}

function hubHrefFor(opportunity: EnterpriseOpportunityApiRecord): string {
  rememberOpportunityRegistryContext(opportunity);
  return buildLoanJourneyHref(opportunity.id);
}

/**
 * Create Dialogue Opportunity with Company as canonical primary borrower.
 * Reuses an existing open Dialogue (or legacy Draft) for this Company (idempotent Start).
 * No individual contact is required at creation.
 */
export async function startOpportunityFromCompany(
  company: EcmCompany,
  options?: {
    allowActiveDuplicateOverride?: boolean;
    overrideReason?: string;
  },
): Promise<StartOpportunityFromContactResult> {
  const readiness = assertCompanyReadyForLoanJourney(company);
  if (!readiness.ready) {
    throw new Error(readiness.message);
  }

  const forceNew = Boolean(options?.allowActiveDuplicateOverride);

  try {
    if (!forceNew) {
      const openDialogue =
        await enterpriseOpportunityApiClient.findOpenDraftForCompany(company.id);
      if (openDialogue?.id) {
        return openExistingOpportunityWorkspace(openDialogue);
      }
    }

    const opportunity = await enterpriseOpportunityApiClient.createOpportunity({
      primaryBorrowerKind: OPPORTUNITY_PRIMARY_BORROWER_KIND.COMPANY,
      companyId: company.id,
      companyName: company.companyName.trim(),
      primaryContactId: null,
      createAsDialogue: true,
      lifecycleStatus: "dialogue",
      requirementStage: "dialogue",
      productId: null,
      productCode: null,
      productLabel: null,
      requestedAmount: null,
      transactionType: null,
      primaryContactName: company.companyName.trim(), // legacy denorm; companyName is SSOT
      relationshipManagerName: company.ownerName?.trim() || null,
      priority: "medium",
      allowActiveDuplicateOverride: options?.allowActiveDuplicateOverride,
      overrideReason: options?.overrideReason,
    });

    if (!opportunity?.id || !opportunity.opportunityNumber?.trim()) {
      throw new Error("Opportunity was not persisted with a reference number.");
    }

    try {
      generateTasksForBusinessEvent({
        event: "opportunity_created",
        entityKind: "Opportunity",
        entityId: opportunity.id,
        entityLabel: opportunity.opportunityNumber,
        opportunityRef: opportunity.id,
        assigneeRef: company.ownerId ? `user:${company.ownerId}` : "employee:rm-001",
        createdBy: "system",
        borrowerName:
          opportunity.companyName?.trim() || company.companyName.trim(),
        grossStage: "Opportunity Workspace",
      });
    } catch {
      /* best-effort */
    }

    return {
      opportunity,
      workspaceHref: hubHrefFor(opportunity),
      created: true,
    };
  } catch (err) {
    if (err instanceof OpportunityApiError && err.code === "ACTIVE_OPPORTUNITY_EXISTS") {
      const existing = (err.data?.existing ?? null) as EnterpriseOpportunityApiRecord | null;
      if (existing?.id) {
        const conflict: ActiveOpportunityConflict = {
          kind: "active_exists",
          message: err.message,
          productLabel: formatProductDisplayLabel({
            productLabel: existing.productLabel,
            productCode: existing.productCode,
          }),
          existing,
        };
        throw Object.assign(new Error(conflict.message), {
          code: "ACTIVE_OPPORTUNITY_EXISTS",
          conflict,
        });
      }
    }
    throw err;
  }
}
