/**
 * Shared stated-draft store for Opportunity Setup → Credit Workbench.
 * Prefills from loan Business Profile / ECM customer role so RMs do not re-enter.
 */

import { listEcmContacts } from "@/lib/enterprise-contact-master";
import type { LoanFile } from "@/types/catalyst-one";
import type { EcwStatedInformationDraft } from "@/types/enterprise-credit-workspace";

export const STATED_DRAFT_KEY = "catalyst.opportunity-setup.stated";
/** Legacy key from Credit Bench naming — still readable. */
const LEGACY_STATED_DRAFT_KEY = "catalyst.credit-bench.stated";

function fmtNum(n?: number): string | undefined {
  if (n == null || Number.isNaN(n)) return undefined;
  return String(n);
}

export function loadStatedDraft(fileId: string): EcwStatedInformationDraft {
  if (typeof window === "undefined") return {};
  try {
    const raw =
      localStorage.getItem(`${STATED_DRAFT_KEY}:${fileId}`) ??
      localStorage.getItem(`${LEGACY_STATED_DRAFT_KEY}:${fileId}`);
    if (!raw) return {};
    return JSON.parse(raw) as EcwStatedInformationDraft;
  } catch {
    return {};
  }
}

export function saveStatedDraft(fileId: string, draft: EcwStatedInformationDraft) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${STATED_DRAFT_KEY}:${fileId}`, JSON.stringify(draft));
}

/** Business-profile fields already captured on the loan file or ECM customer role. */
export function businessProfileFromLoanFile(file: LoanFile): {
  turnover?: string;
  vintage?: string;
  natureOfBusiness?: string;
  companyName?: string;
  constitution?: string;
  monthlyIncome?: string;
  source: "loan" | "contact" | "none";
} {
  const bd = file.businessDetails;
  const contact = listEcmContacts().find((c) => c.id === file.customerId);
  const customer = contact?.roleProfiles?.customer ?? {};

  const turnover =
    fmtNum(bd?.annualTurnover) ||
    customer.annualTurnover?.trim() ||
    undefined;
  const vintage =
    fmtNum(bd?.businessVintage) ||
    customer.yearsInBusiness?.trim() ||
    undefined;
  const natureOfBusiness =
    customer.natureOfBusiness?.trim() ||
    customer.industry?.trim() ||
    bd?.constitution ||
    undefined;
  const companyName =
    bd?.companyName?.trim() ||
    customer.businessName?.trim() ||
    undefined;
  const constitution = bd?.constitution?.trim() || undefined;
  const monthlyIncome = fmtNum(bd?.monthlySalary);

  const hasAny = Boolean(
    turnover || vintage || natureOfBusiness || companyName || constitution || monthlyIncome,
  );

  return {
    turnover,
    vintage,
    natureOfBusiness,
    companyName,
    constitution,
    monthlyIncome,
    source: hasAny ? (bd ? "loan" : contact ? "contact" : "none") : "none",
  };
}

/**
 * Merge: local RM draft overrides, then Business Profile, then empty.
 * Does not overwrite draft keys that the RM already saved.
 */
export function resolveStatedDraftForFile(file: LoanFile): EcwStatedInformationDraft {
  const stored = loadStatedDraft(file.id);
  const profile = businessProfileFromLoanFile(file);

  return {
    statedIncomeMonthly: stored.statedIncomeMonthly || profile.monthlyIncome,
    statedObligations: stored.statedObligations,
    statedTurnover: stored.statedTurnover || profile.turnover,
    statedBusinessVintage: stored.statedBusinessVintage || profile.vintage,
    statedNatureOfBusiness: stored.statedNatureOfBusiness || profile.natureOfBusiness,
    statedPropertyType: stored.statedPropertyType || file.propertyType,
    statedPropertyValue: stored.statedPropertyValue,
    statedPropertyLocation: stored.statedPropertyLocation,
    notes: stored.notes,
  };
}
