/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-010 — Server-side credit intelligence projector.
 */

import "server-only";

import { enterpriseOpportunityService } from "@server/services/enterprise-opportunity";
import { buildChanakyaDocumentIntelligencePack } from "@/lib/chanakya-document-intelligence";
import type { ChanakyaCreditIntelligenceContext } from "@/types/chanakya-credit-intelligence";
import { redactCustomerContactPiiForAiContext } from "@/lib/chanakya-enterprise-read-context/redact-pii";
import type { StatedCreditWorkbenchInput } from "@/lib/chanakya-enterprise-read-context/product-lender-intelligence-core";
import {
  assembleCreditIntelligence,
  type CreditIntelligenceAssemblyInput,
} from "./credit-intelligence-core";

async function resolveOpportunityRow(
  organizationId: string,
  opportunityRef: string,
): Promise<Record<string, unknown> | null> {
  const ref = opportunityRef.trim();
  if (!ref) return null;
  try {
    const row = (await enterpriseOpportunityService.getOpportunity(ref)) as Record<
      string,
      unknown
    >;
    if (row && String(row.organizationId || "") === organizationId) return row;
  } catch {
    /* search fallback */
  }
  try {
    const search = await enterpriseOpportunityService.searchOpportunities({
      q: ref,
      limit: 10,
    });
    const upper = ref.toUpperCase();
    return (
      (search.items as Array<Record<string, unknown>>).find(
        (r) =>
          String(r.organizationId || "") === organizationId &&
          (String(r.id) === ref ||
            String(r.opportunityNumber || "").toUpperCase() === upper),
      ) ?? null
    );
  } catch {
    return null;
  }
}

export async function projectCreditIntelligence(input: {
  organizationId: string;
  opportunityRef?: string | null;
  opportunityId?: string | null;
  opportunityRow?: Record<string, unknown> | null;
  stated?: StatedCreditWorkbenchInput;
  /** When true, reuse pre-built document pack instead of loading again. */
  documentPack?: Awaited<ReturnType<typeof buildChanakyaDocumentIntelligencePack>>;
}): Promise<ChanakyaCreditIntelligenceContext> {
  const ref = (input.opportunityRef ?? input.opportunityId ?? "").trim();
  if (!ref) {
    return assembleCreditIntelligence({
      opportunityId: "",
      organizationId: input.organizationId,
      structuredFacts: [],
      crossDocumentComparisons: [],
      reads: [],
      limitations: ["Opportunity reference required for credit intelligence."],
    });
  }

  const oppRaw =
    input.opportunityRow ??
    (await resolveOpportunityRow(input.organizationId, ref));
  const opp = oppRaw
    ? (redactCustomerContactPiiForAiContext(oppRaw) as Record<string, unknown>)
    : null;
  const opportunityId = String(opp?.id ?? ref);

  const pack =
    input.documentPack ??
    (await buildChanakyaDocumentIntelligencePack({ opportunityId }));

  const assemblyInput: CreditIntelligenceAssemblyInput = {
    opportunityId,
    organizationId: input.organizationId,
    structuredFacts: pack.structuredFacts,
    crossDocumentComparisons: pack.crossDocumentComparisons,
    reads: pack.reads,
    stated: input.stated,
    opportunityFields: opp
      ? {
          companyName:
            typeof opp.companyName === "string" ? opp.companyName : null,
          employmentTypeCode:
            typeof opp.employmentTypeCode === "string"
              ? opp.employmentTypeCode
              : null,
          cityLabel: typeof opp.cityLabel === "string" ? opp.cityLabel : null,
          requestedAmount:
            typeof opp.requestedAmount === "number" ? opp.requestedAmount : null,
          transactionType:
            typeof opp.transactionType === "string" ? opp.transactionType : null,
        }
      : undefined,
    webResearchAvailable: false,
    limitations: pack.limitations.slice(0, 6),
  };

  return assembleCreditIntelligence(assemblyInput);
}
