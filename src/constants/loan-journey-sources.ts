/**
 * Prompt 019 — Loan Journey source catalogue + Source Contact role filters (UI only).
 */

import type { EcmContactRole } from "@/types/enterprise-contact-master";

export const LOAN_JOURNEY_SOURCES = [
  "Direct",
  "DSA Partner",
  "Builder",
  "Chartered Accountant",
  "Employee Referral",
  "Existing Customer",
  "Other Referral",
] as const;

export type LoanJourneySource = (typeof LOAN_JOURNEY_SOURCES)[number];

/** Map Source → ECM roles for Source Contact filtering. Direct = hide field. */
export function getSourceContactFilterRoles(
  source: string,
): EcmContactRole[] | "all" | "hide" {
  switch (source) {
    case "Direct":
      return "hide";
    case "DSA Partner":
      return ["partner"];
    case "Builder":
    case "Builder Tie-up":
      return ["builder"];
    case "Chartered Accountant":
      return ["chartered_accountant"];
    case "Employee Referral":
      return ["employee"];
    case "Existing Customer":
      return ["customer"];
    case "Other Referral":
    case "Referral":
      return "all";
    default:
      return "all";
  }
}

export function isLoanJourneySourceDirect(source: string): boolean {
  return getSourceContactFilterRoles(source) === "hide";
}
