/**
 * CO-HOTFIX-006 — Enterprise Contact Registry (platform SSOT).
 * Every module must consume contacts/companies through this layer.
 */

export {
  listOperationalContacts,
  searchOperationalContacts,
  findOperationalContactById,
  listOperationalEcmContacts,
  findOperationalEcmContactById,
  toContactPickerOption,
  type EnterpriseContactOption,
} from "./contacts";

export {
  listOperationalCompanies,
  searchOperationalCompanies,
  findOperationalCompanyById,
  toCompanyPickerOption,
  type EnterpriseCompanyOption,
} from "./companies";

export {
  searchEnterpriseEntities,
  buildParticipantEntityOptions,
  type EnterpriseEntitySearchResult,
  type EnterpriseEntityKind,
} from "./entity-search";

export { ensureEnterpriseRegistryHydrated, resetEnterpriseRegistryHydration } from "./hydrate";

export {
  liveSearchOperationalContacts,
  liveSearchOperationalCompanies,
  warmPickerCachesFromApi,
} from "./live-search";

// Backward-compatible aliases (CO-HOTFIX-005)
export {
  buildLoanJourneyContactOptions,
  buildLoanJourneyCompanyOptions,
  buildLoanJourneyParticipantEntityOptions,
  findLoanJourneyContactById,
  listLoanJourneySourceContacts,
  type LoanJourneyContactOption,
  type LoanJourneyCompanyOption,
  type LoanJourneySourceContactOption,
} from "./legacy-loan-journey";
