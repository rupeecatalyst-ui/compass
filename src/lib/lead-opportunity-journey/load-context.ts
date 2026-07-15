"use client";

/**
 * Shared loan-file context loader for Lead Stage surfaces (presentation only).
 */

import { getInitialLoanFiles } from "@/data/catalyst-one/loan-files";
import { loadLoanFiles } from "@/lib/loan-files-storage";
import {
  opportunityNumberForFile,
  resolveEcwSelectedLender,
} from "@/lib/enterprise-credit-workspace";
import { formatINR } from "@/lib/format-currency";
import { getJourneyStageDisplayLabel } from "@/constants/lead-opportunity-journey";
import type { LoanFile } from "@/types/catalyst-one";
import type { JourneyContextChips } from "@/components/catalyst-one/shared/lead-opportunity-journey-chrome";

export function loadLeadJourneyLoanFile(fileId: string | null): LoanFile | null {
  const files =
    typeof window === "undefined" ? getInitialLoanFiles() : loadLoanFiles() ?? getInitialLoanFiles();
  if (fileId) {
    return files.find((f) => f.id === fileId && !f.archived) ?? null;
  }
  return files.find((f) => !f.archived) ?? null;
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
