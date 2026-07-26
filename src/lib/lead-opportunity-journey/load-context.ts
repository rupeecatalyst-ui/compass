/**
 * Shared journey context loader — FS-01 Opportunity-first.
 *
 * Stages must resolve via Opportunity Registry (opportunity-runtime-adapter).
 * LoanFile lookup remains a compatibility path only.
 */

import {
  opportunityNumberForFile,
  resolveEcwSelectedLender,
} from "@/lib/enterprise-credit-workspace";
import { formatINR } from "@/lib/format-currency";
import { getJourneyStageDisplayLabel } from "@/constants/lead-opportunity-journey";
import {
  resolveOpportunityRuntimeCase,
  resolveOpportunityRuntimeCaseSync,
  isOpportunityRuntimeCase,
} from "@/lib/lead-opportunity-journey/opportunity-runtime-adapter";
import {
  displayOpportunityAmount,
  displayOpportunityText,
} from "@/lib/lead-opportunity-journey/opportunity-field-display";
import type { LoanFile } from "@/types/catalyst-one";
import type { JourneyContextChips } from "@/components/catalyst-one/shared/lead-opportunity-journey-chrome";

/**
 * @deprecated Prefer `resolveOpportunityRuntimeCase` (async). Sync peek uses Registry cache.
 * Kept for chrome gates that still need a synchronous snapshot.
 */
export function loadLeadJourneyLoanFile(
  fileId: string | null,
  opportunityId?: string | null,
  options?: { dashboardEntry?: boolean },
): LoanFile | null {
  return resolveOpportunityRuntimeCaseSync({
    fileId,
    opportunityId,
    dashboardEntry: options?.dashboardEntry,
  });
}

/** FS-01 — canonical async runtime resolve for Opportunity stages. */
export async function loadOpportunityJourneyRuntime(
  fileId: string | null,
  opportunityId?: string | null,
  options?: { dashboardEntry?: boolean },
): Promise<LoanFile | null> {
  return resolveOpportunityRuntimeCase({
    fileId,
    opportunityId,
    dashboardEntry: options?.dashboardEntry,
  });
}

/** Soft read of session/runtime cache (e.g. Continue chain mid-flight). */
export function peekActiveJourneyFile(): LoanFile | null {
  return resolveOpportunityRuntimeCaseSync({});
}

export function journeyContextFromLoanFile(file: LoanFile | null): JourneyContextChips {
  if (!file) return {};
  const lender = resolveEcwSelectedLender(file);
  const amount = isOpportunityRuntimeCase(file)
    ? displayOpportunityAmount(file.requiredAmount, { captured: file.amountCaptured })
    : formatINR(file.requiredAmount || file.loanAmount);
  const stageLabel =
    isOpportunityRuntimeCase(file) && !file.stage?.trim()
      ? displayOpportunityText(file.stage)
      : getJourneyStageDisplayLabel(file.stage);
  return {
    opportunity: opportunityNumberForFile(file),
    customer: displayOpportunityText(file.customerName),
    product: displayOpportunityText(file.loanProduct),
    amount,
    stage: stageLabel,
    rm: displayOpportunityText(file.relationshipManager),
    life: lender.enabled ? lender.lenderName : undefined,
  };
}
