/**
 * CO-ARCH-003 / CO-P0-006 — Primary create: Opportunity first; Deal only with lender (BI-1…BI-3).
 */
import { isDealRegistryPrimaryWriteEnabled } from "@/constants/enterprise-deal-registry";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import {
  mapLoanFileToDealCreateBody,
  mapLoanFileToOpportunityCreateBody,
  resolvePrimaryLenderRegistryId,
  validateLoanFileForDealImport,
} from "@/lib/enterprise-deal/map-loan-file-to-deal";
import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";
import type { EnterpriseOpportunityApiRecord } from "@/lib/enterprise-opportunity/opportunity-api-client";
import type { LoanFile } from "@/types/catalyst-one";
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";

export class DealCreatePersistenceError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(message: string, code = "DEAL_CREATE_FAILED", status?: number) {
    super(message);
    this.name = "DealCreatePersistenceError";
    this.code = code;
    this.status = status;
  }
}

export function assertPrimaryWriteEnvironment(): void {
  if (!isDealRegistryPrimaryWriteEnabled()) return;
  if (!isEnterprisePersistencePrisma()) {
    throw new DealCreatePersistenceError(
      "Enterprise Deal primary write requires ENTERPRISE_PERSISTENCE_MODE=prisma (and NEXT_PUBLIC mirror).",
      "PERSISTENCE_MODE_REQUIRED",
      503,
    );
  }
}

export async function persistNewOpportunityToEnterpriseRegistry(
  file: LoanFile,
): Promise<EnterpriseOpportunityApiRecord> {
  assertPrimaryWriteEnvironment();
  if (typeof window === "undefined") {
    throw new DealCreatePersistenceError(
      "Opportunity create must run in the browser session (authenticated API client).",
      "CLIENT_ONLY",
    );
  }
  if (!file.customerId?.trim()) {
    throw new DealCreatePersistenceError(
      "Borrower party id (customerId) is required to create an Opportunity — Contact for Individual borrowers",
      "VALIDATION",
      400,
    );
  }
  try {
    return await enterpriseOpportunityApiClient.createOpportunity(
      mapLoanFileToOpportunityCreateBody(file),
    );
  } catch (err) {
    const e = err as {
      code?: string;
      data?: {
        existing?: EnterpriseOpportunityApiRecord;
        existingOpportunityId?: string;
      };
    };
    if (e.code === "ACTIVE_OPPORTUNITY_EXISTS") {
      const existingId = e.data?.existing?.id || e.data?.existingOpportunityId;
      if (existingId) {
        return await enterpriseOpportunityApiClient.getOpportunity(existingId);
      }
    }
    const ex = err as Error & { status?: number; code?: string };
    throw new DealCreatePersistenceError(
      ex.message || "Enterprise Opportunity create failed",
      ex.code || "OPPORTUNITY_API_ERROR",
      ex.status,
    );
  }
}

/** Awaited Deal create — requires Opportunity + lender (BI-2 / BI-3). */
export async function persistNewDealToEnterpriseRegistry(
  file: LoanFile,
  links: { opportunityId: string; lenderId: string; lenderProgramId?: string | null },
): Promise<EnterpriseDealApiRecord> {
  assertPrimaryWriteEnvironment();

  if (typeof window === "undefined") {
    throw new DealCreatePersistenceError(
      "Deal create must run in the browser session (authenticated API client).",
      "CLIENT_ONLY",
    );
  }

  const validationErrors = validateLoanFileForDealImport(file).filter(
    (i) => i.severity === "error",
  );
  if (validationErrors.length > 0) {
    throw new DealCreatePersistenceError(
      validationErrors.map((e) => e.message).join("; "),
      "VALIDATION",
      400,
    );
  }

  try {
    return await enterpriseDealApiClient.createDeal(
      mapLoanFileToDealCreateBody(file, links),
    );
  } catch (err) {
    const e = err as Error & { status?: number; code?: string };
    throw new DealCreatePersistenceError(
      e.message || "Enterprise Deal create failed",
      e.code || "DEAL_API_ERROR",
      e.status,
    );
  }
}

export function attachEnterpriseOpportunityIdentity(
  file: LoanFile,
  opportunity: EnterpriseOpportunityApiRecord,
): LoanFile {
  return {
    ...file,
    enterpriseOpportunityId: opportunity.id,
    opportunityNumber: opportunity.opportunityNumber,
  };
}

export function attachEnterpriseDealIdentity(
  file: LoanFile,
  deal: EnterpriseDealApiRecord,
): LoanFile {
  return {
    ...file,
    enterpriseDealId: deal.id,
    dealNumber: deal.dealNumber,
    fileNumber: deal.fileNumber || deal.dealNumber || file.fileNumber,
  };
}

export { resolvePrimaryLenderRegistryId };
