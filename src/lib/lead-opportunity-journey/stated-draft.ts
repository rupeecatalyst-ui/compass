/**
 * Shared stated-draft store for Opportunity Setup → Credit Workbench.
 * Prefills from loan Business Profile / ECM customer role so RMs do not re-enter.
 *
 * CO-UX-009 — Nature of Business always resolves live from Customer / Company Profile (SSOT).
 */

import { listEcmContacts } from "@/lib/enterprise-contact-master";
import { resolveNatureOfBusinessFromProfile } from "@/lib/lead-opportunity-journey/nature-of-business";
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

/** Business-profile fields already captured on the loan file or ECM customer / company profile. */
export function businessProfileFromLoanFile(file: LoanFile): {
  turnover?: string;
  vintage?: string;
  /** Display label from Customer / Company Profile SSOT */
  natureOfBusiness?: string;
  natureOfBusinessCode?: string;
  natureOfBusinessSource: "company" | "contact" | "none";
  companyName?: string;
  constitution?: string;
  monthlyIncome?: string;
  source: "loan" | "contact" | "company" | "none";
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
  const nature = resolveNatureOfBusinessFromProfile(file);
  const natureOfBusiness =
    nature.source === "none" ? undefined : nature.label;
  const companyName =
    bd?.companyName?.trim() ||
    customer.businessName?.trim() ||
    undefined;
  const constitution = bd?.constitution?.trim() || undefined;
  const monthlyIncome = fmtNum(bd?.monthlySalary);

  const hasAny = Boolean(
    turnover || vintage || natureOfBusiness || companyName || constitution || monthlyIncome,
  );

  let source: "loan" | "contact" | "company" | "none" = "none";
  if (hasAny) {
    if (nature.source === "company") source = "company";
    else if (nature.source === "contact") source = "contact";
    else if (bd) source = "loan";
    else if (contact) source = "contact";
  }

  return {
    turnover,
    vintage,
    natureOfBusiness,
    natureOfBusinessCode: nature.code ?? undefined,
    natureOfBusinessSource: nature.source,
    companyName,
    constitution,
    monthlyIncome,
    source,
  };
}

/**
 * Merge: local RM draft overrides, then Business Profile, then empty.
 * Does not overwrite draft keys that the RM already saved —
 * except Nature of Business, which always mirrors Customer / Company Profile (CO-UX-009).
 */
export function resolveStatedDraftForFile(file: LoanFile): EcwStatedInformationDraft {
  const stored = loadStatedDraft(file.id);
  const profile = businessProfileFromLoanFile(file);

  return {
    statedIncomeMonthly: stored.statedIncomeMonthly || profile.monthlyIncome,
    statedObligations: stored.statedObligations,
    statedTurnover: stored.statedTurnover || profile.turnover,
    statedBusinessVintage: stored.statedBusinessVintage || profile.vintage,
    statedNatureOfBusiness: profile.natureOfBusiness,
    statedConstitution: stored.statedConstitution || profile.constitution,
    statedPropertyType: stored.statedPropertyType || file.propertyType,
    statedPropertyValue: stored.statedPropertyValue,
    statedPropertyLocation: stored.statedPropertyLocation,
    notes: stored.notes,
  };
}

