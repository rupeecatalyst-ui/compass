/**
 * ADR-018 Wave 3 / CO-OPP-002 — Frozen Start Loan Journey.
 *
 * Contact → Start Loan Journey → Create Dialogue Opportunity → Execution Hub (/loan-journey)
 * → Lead Information → Requirement Captured → Opportunity Workspace …
 *
 * Dialogue is identity-only (CAD-2026-001). No LoanFile or Deal on this path.
 * P1: Start is idempotent — reuse an open Dialogue for the Contact; never mint a second.
 */
import {
  formatProductDisplayLabel,
} from "@/constants/opportunity-active-uniqueness";
import { rememberOpportunityRegistryContext } from "@/lib/lead-opportunity-journey/opportunity-context";
import {
  enterpriseOpportunityApiClient,
  OpportunityApiError,
  type EnterpriseOpportunityApiRecord,
} from "@/lib/enterprise-opportunity/opportunity-api-client";
import { buildLoanJourneyHref } from "@/lib/loan-journey/adr-018-routing";
import type { EcmContact } from "@/types/enterprise-contact-master";
import { generateTasksForBusinessEvent } from "@/lib/enterprise-task-engine/auto-generation";

export type StartOpportunityFromContactResult = {
  opportunity: EnterpriseOpportunityApiRecord;
  workspaceHref: string;
  created: boolean;
};

export type ActiveOpportunityConflict = {
  kind: "active_exists";
  message: string;
  productLabel: string;
  existing: EnterpriseOpportunityApiRecord;
};

export type ContactLoanJourneyReadiness =
  | { ready: true }
  | { ready: false; message: string };

function contactEmail(contact: EcmContact): string | null {
  return contact.personalEmail?.trim() || contact.officialEmail?.trim() || null;
}

function hubHrefFor(opportunity: EnterpriseOpportunityApiRecord): string {
  rememberOpportunityRegistryContext(opportunity);
  return buildLoanJourneyHref(opportunity.id);
}

/**
 * Minimum mandatory Contact information to begin a loan journey (Primary Applicant).
 * Full Name + Mobile — Progressive Contact Creation constitution.
 */
export function assertContactReadyForLoanJourney(
  contact: Pick<EcmContact, "id" | "name" | "mobilePrimary">,
): ContactLoanJourneyReadiness {
  if (!contact.id?.trim()) {
    return {
      ready: false,
      message: "Contact is missing a registry id.",
    };
  }
  if (!contact.name?.trim() || !contact.mobilePrimary?.trim()) {
    return {
      ready: false,
      message:
        "Primary Applicant needs Full Name and Mobile before starting a loan journey.",
    };
  }
  return { ready: true };
}

/**
 * Create Dialogue Opportunity (identity only) and land on Execution Hub.
 * Reuses an existing open Dialogue (or legacy Draft) for this Contact (idempotent Start).
 * Does not invent product / amount / lending / transaction defaults.
 */
export async function startOpportunityFromContact(
  contact: EcmContact,
  options?: {
    allowActiveDuplicateOverride?: boolean;
    overrideReason?: string;
  },
): Promise<StartOpportunityFromContactResult> {
  const readiness = assertContactReadyForLoanJourney(contact);
  if (!readiness.ready) {
    throw new Error(readiness.message);
  }

  const forceNew = Boolean(options?.allowActiveDuplicateOverride);

  try {
    if (!forceNew) {
      const openDialogue =
        await enterpriseOpportunityApiClient.findOpenDraftForContact(contact.id);
      if (openDialogue?.id) {
        return openExistingOpportunityWorkspace(openDialogue);
      }
    }

    const opportunity = await enterpriseOpportunityApiClient.createOpportunity({
      primaryContactId: contact.id,
      createAsDialogue: true,
      lifecycleStatus: "dialogue",
      requirementStage: "dialogue",
      productId: null,
      productCode: null,
      productLabel: null,
      requestedAmount: null,
      transactionType: null,
      primaryContactName: contact.name?.trim() || null,
      primaryContactMobile: contact.mobilePrimary?.trim() || null,
      primaryContactEmail: contactEmail(contact),
      relationshipManagerName: contact.ownerName?.trim() || null,
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
        contactId: contact.id,
        assigneeRef: contact.ownerId
          ? `user:${contact.ownerId}`
          : "employee:rm-001",
        createdBy: "system",
        borrowerName: contact.name,
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

/** Open existing Opportunity at Execution Hub (orchestration), not OW/Deal. */
export function openExistingOpportunityWorkspace(
  opportunity: EnterpriseOpportunityApiRecord,
): StartOpportunityFromContactResult {
  return {
    opportunity,
    workspaceHref: hubHrefFor(opportunity),
    created: false,
  };
}

/**
 * P1 — Open Dialogue for Contact (Start Loan Journey reuse probe).
 */
export async function findActiveOpportunityForStartLoanJourney(
  contact: EcmContact,
): Promise<EnterpriseOpportunityApiRecord | null> {
  if (!contact.id?.trim()) return null;
  return enterpriseOpportunityApiClient.findOpenDraftForContact(contact.id);
}
