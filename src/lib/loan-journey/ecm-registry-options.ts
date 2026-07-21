/**
 * CO-HOTFIX-005/006 — delegates to enterprise-registry SSOT.
 */

export {
  buildLoanJourneyContactOptions,
  buildLoanJourneyCompanyOptions,
  buildLoanJourneyParticipantEntityOptions,
  findLoanJourneyContactById,
  listLoanJourneySourceContacts,
  type LoanJourneyContactOption,
  type LoanJourneyCompanyOption,
  type LoanJourneySourceContactOption,
} from "@/lib/enterprise-registry/legacy-loan-journey";
