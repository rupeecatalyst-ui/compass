"use client";

/**
 * Shared loan-file context loader for Lead Stage surfaces (presentation only).
 * In-transaction: restore Active Opportunity Context when URL omits params.
 * Dashboard entry (`entry=dashboard`): clear context and return null (picker / list).
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

function rememberFile(
  hit: LoanFile,
  opportunityId?: string | null,
): void {
  setActiveOpportunityContext({
    fileId: hit.id,
    opportunityId: opportunityId ?? undefined,
    customerName: hit.customerName,
    product: hit.loanProduct,
    label: opportunityNumberForFile(hit),
  });
}

/**
 * Resolve loan file for journey surfaces.
 * - dashboardEntry: explicit main-nav / return-to-dashboard → no transaction
 * - file / opportunityId URL params: load and remember
 * - bare URL with active context: restore same transaction (no Kanban bounce)
 */
export function loadLeadJourneyLoanFile(
  fileId: string | null,
  opportunityId?: string | null,
  options?: { dashboardEntry?: boolean },
): LoanFile | null {
  const files = allFiles().filter((f) => !f.archived);

  if (options?.dashboardEntry) {
    clearActiveOpportunityContext();
    return null;
  }

  if (fileId) {
    const hit = files.find((f) => f.id === fileId) ?? null;
    if (hit) rememberFile(hit, opportunityId);
    return hit;
  }

  if (opportunityId) {
    const matches = resolveLoansForOpportunity(opportunityId, null);
    const hit = matches[0] ?? null;
    if (hit) rememberFile(hit, opportunityId);
    return hit;
  }

  const ctx = getActiveOpportunityContext();
  if (ctx?.fileId) {
    const hit = files.find((f) => f.id === ctx.fileId) ?? null;
    if (hit) {
      rememberFile(hit, ctx.opportunityId ?? opportunityId);
      return hit;
    }
  }

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
