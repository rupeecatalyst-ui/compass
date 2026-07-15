"use client";

/**
 * Shared loan-file context loader for Lead Stage surfaces (presentation only).
 * Does NOT default to the first file — bare routes require Active Opportunity Context / picker.
 */

import { getInitialLoanFiles } from "@/data/catalyst-one/loan-files";
import { loadLoanFiles } from "@/lib/loan-files-storage";
import {
  opportunityNumberForFile,
  resolveEcwSelectedLender,
} from "@/lib/enterprise-credit-workspace";
import { formatINR } from "@/lib/format-currency";
import { getJourneyStageDisplayLabel } from "@/constants/lead-opportunity-journey";
import {
  clearActiveOpportunityContext,
  getActiveOpportunityContext,
  setActiveOpportunityContext,
} from "@/lib/lead-opportunity-journey/active-context";
import { resolveLoansForOpportunity } from "@/lib/opportunity-loan-continuity";
import type { LoanFile } from "@/types/catalyst-one";
import type { JourneyContextChips } from "@/components/catalyst-one/shared/lead-opportunity-journey-chrome";

function allFiles(): LoanFile[] {
  return typeof window === "undefined"
    ? getInitialLoanFiles()
    : loadLoanFiles() ?? getInitialLoanFiles();
}

/**
 * Resolve loan file for guided URL params only.
 * Bare open (no file / opportunityId) returns null — caller shows Opportunity Picker.
 * Guided continue may pass only opportunityId; we resolve via continuity helpers.
 */
export function loadLeadJourneyLoanFile(
  fileId: string | null,
  opportunityId?: string | null,
): LoanFile | null {
  const files = allFiles().filter((f) => !f.archived);

  if (fileId) {
    const hit = files.find((f) => f.id === fileId) ?? null;
    if (hit) {
      setActiveOpportunityContext({
        fileId: hit.id,
        opportunityId: opportunityId ?? undefined,
        customerName: hit.customerName,
        product: hit.loanProduct,
        label: opportunityNumberForFile(hit),
      });
    }
    return hit;
  }

  if (opportunityId) {
    const matches = resolveLoansForOpportunity(opportunityId, null);
    const hit = matches[0] ?? null;
    if (hit) {
      setActiveOpportunityContext({
        fileId: hit.id,
        opportunityId,
        customerName: hit.customerName,
        product: hit.loanProduct,
        label: opportunityNumberForFile(hit),
      });
    }
    return hit;
  }

  // Bare navigation: do not resurrect stale defaults.
  // Guided session context is only used when already mid-journey via URL params.
  clearActiveOpportunityContext();
  return null;
}

/** Soft read of session context (e.g. Continue chain mid-flight). Prefer URL params. */
export function peekActiveJourneyFile(): LoanFile | null {
  const ctx = getActiveOpportunityContext();
  if (!ctx?.fileId) return null;
  return allFiles().find((f) => f.id === ctx.fileId && !f.archived) ?? null;
}

export function journeyContextFromLoanFile(file: LoanFile | null): JourneyContextChips {
  if (!file) return {};
  const lender = resolveEcwSelectedLender(file);
  return {
    opportunity: opportunityNumberForFile(file),
    customer: file.customerName,
    product: file.loanProduct,
    amount: formatINR(file.requiredAmount || file.loanAmount),
    stage: getJourneyStageDisplayLabel(file.stage),
    rm: file.relationshipManager,
    life: lender.enabled ? lender.lenderName : undefined,
  };
}
