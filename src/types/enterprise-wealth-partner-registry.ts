/**
 * CO-WP-001 — Enterprise Wealth Partner Registry domain types.
 * Wealth Partner is a business relationship on top of Contact or Company identity.
 */

import type { WealthPartnerLegalComplianceProjection } from "@/types/enterprise-wealth-partner-legal-docket";

export type WealthPartnerIdentityKind = "contact" | "company";

export type WealthPartnerLifecycleStatus =
  | "draft"
  | "onboarding"
  | "active"
  | "suspended"
  | "retired";

export type WealthPartnerOperationalStatus = "inactive" | "active" | "restricted";

export type WealthPartnerNetworkMemberStatus = "active" | "inactive" | "ended";

export type WealthPartnerCommissionPayoutFrequency =
  | "monthly"
  | "quarterly"
  | "half_yearly"
  | "annually"
  | "on_disbursement"
  | "other";

export type WealthPartnerTypeCode =
  | "chartered_accountant"
  | "builder"
  | "dsa"
  | "property_consultant"
  | "architect"
  | "financial_consultant"
  | "insurance_advisor"
  | "mutual_fund_distributor"
  | "loan_consultant"
  | "corporate"
  | "referral_associate"
  | "others";

export type RegistryStatusLite = "draft" | "active" | "inactive" | "archived";

export interface WealthPartnerCommissionSlab {
  fromAmount: number;
  toAmount: number | null;
  ratePercent: number;
}

export interface EnterpriseWealthPartnerRecord {
  id: string;
  organizationId: string;
  code: string;
  displayName: string;
  partnerType: WealthPartnerTypeCode | string;
  identityKind: WealthPartnerIdentityKind;
  contactId: string | null;
  companyId: string | null;
  identityLabel: string | null;
  lifecycleStatus: WealthPartnerLifecycleStatus;
  operationalStatus: WealthPartnerOperationalStatus;
  pan: string | null;
  gstin: string | null;
  email: string | null;
  mobile: string | null;
  cityLabel: string | null;
  stateLabel: string | null;
  website: string | null;
  notes: string | null;
  profileJson: Record<string, unknown> | null;
  complianceJson: Record<string, unknown> | null;
  /** CO-OPP-003 — % of RC revenue by Participation Role. */
  commercialReferralSharePercent: number | null;
  commercialSoleExecutorSharePercent: number | null;
  commercialJointExecutorSharePercent: number | null;
  commercialEffectiveFrom: string | null;
  commercialStatus: string;
  sortOrder: number;
  status: RegistryStatusLite;
  enabled: boolean;
  versionNumber: number;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  isDeleted: boolean;
  createdBy: string;
  modifiedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnterpriseWealthPartnerNetworkMemberRecord {
  id: string;
  organizationId: string;
  parentPartnerId: string;
  identityKind: WealthPartnerIdentityKind;
  childContactId: string | null;
  childCompanyId: string | null;
  childDisplayName: string;
  relationshipType: string;
  memberPartnerType: string | null;
  effectiveDate: string;
  status: WealthPartnerNetworkMemberStatus;
  notes: string | null;
  createdBy: string;
  modifiedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnterpriseWealthPartnerCommissionRecord {
  id: string;
  organizationId: string;
  wealthPartnerId: string;
  code: string;
  label: string;
  productCode: string | null;
  productLabel: string | null;
  structureKind: "product" | "slab" | string;
  slabsJson: WealthPartnerCommissionSlab[] | null;
  ratePercent: number | null;
  rateBps: number | null;
  flatAmount: number | null;
  currencyCode: string;
  payoutFrequency: WealthPartnerCommissionPayoutFrequency;
  overrideRulesJson: Record<string, unknown> | null;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  status: RegistryStatusLite;
  enabled: boolean;
  versionNumber: number;
  notes: string | null;
  createdBy: string;
  modifiedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnterpriseWealthPartnerBankAccountRecord {
  id: string;
  organizationId: string;
  wealthPartnerId: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  accountType: string | null;
  isPrimary: boolean;
  enabled: boolean;
  notes: string | null;
  createdBy: string;
  modifiedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnterpriseWealthPartnerActivityRecord {
  id: string;
  organizationId: string;
  wealthPartnerId: string;
  activityType: string;
  title: string;
  detail: string | null;
  payload: Record<string, unknown> | null;
  actorUserId: string | null;
  createdAt: string;
}

export interface WealthPartnerListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  partnerType?: WealthPartnerTypeCode | "all" | string;
  identityKind?: WealthPartnerIdentityKind | "all";
  status?: RegistryStatusLite | "all" | string;
  enabled?: boolean;
  includeDeleted?: boolean;
  /** CO-WP-006 — exact Contact identity lookup */
  contactId?: string;
  /** CO-WP-006 — exact Company identity lookup */
  companyId?: string;
  /**
   * CO-WP-102B — When false/omitted, BAT demo partners (WPDEMO001) are excluded
   * from operational registry lists / analytics feeds. Admin may pass true to manage.
   */
  includeBatDemo?: boolean;
}

/** CO-WP-001 / CO-WP-006 — summary returned when Contact/Company already has a WP. */
export interface ExistingWealthPartnerSummary {
  partnerId: string;
  code: string;
  displayName: string;
  partnerType?: string | null;
  status: string;
  lifecycleStatus: string;
  operationalStatus?: string | null;
  createdAt: string;
  identityKind: WealthPartnerIdentityKind | string;
  reason:
    | "already_registered"
    | "soft_deleted_recovered"
    | "orphan_identity_missing"
    | "duplicate_code_retry";
}

export interface WealthPartnerListResult {
  items: EnterpriseWealthPartnerRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateWealthPartnerInput {
  displayName?: string;
  partnerType: WealthPartnerTypeCode | string;
  identityKind: WealthPartnerIdentityKind;
  contactId?: string | null;
  companyId?: string | null;
  identityLabel?: string | null;
  pan?: string | null;
  gstin?: string | null;
  email?: string | null;
  mobile?: string | null;
  cityLabel?: string | null;
  stateLabel?: string | null;
  website?: string | null;
  notes?: string | null;
  createdBy: string;
}

export interface UpdateWealthPartnerInput {
  displayName?: string;
  partnerType?: WealthPartnerTypeCode | string;
  pan?: string | null;
  gstin?: string | null;
  email?: string | null;
  mobile?: string | null;
  cityLabel?: string | null;
  stateLabel?: string | null;
  website?: string | null;
  notes?: string | null;
  profileJson?: Record<string, unknown> | null;
  complianceJson?: Record<string, unknown> | null;
  commercialReferralSharePercent?: number | null;
  commercialSoleExecutorSharePercent?: number | null;
  commercialJointExecutorSharePercent?: number | null;
  commercialEffectiveFrom?: string | null;
  commercialStatus?: string | null;
  lifecycleStatus?: WealthPartnerLifecycleStatus;
  operationalStatus?: WealthPartnerOperationalStatus;
  status?: RegistryStatusLite;
  enabled?: boolean;
  modifiedBy: string;
}

export interface CreateWealthPartnerNetworkMemberInput {
  identityKind: WealthPartnerIdentityKind;
  childContactId?: string | null;
  childCompanyId?: string | null;
  childDisplayName: string;
  relationshipType: string;
  memberPartnerType?: string | null;
  effectiveDate?: string;
  notes?: string | null;
  createdBy: string;
}

export interface CreateWealthPartnerCommissionInput {
  label: string;
  productCode?: string | null;
  productLabel?: string | null;
  structureKind?: "product" | "slab" | string;
  slabsJson?: WealthPartnerCommissionSlab[] | null;
  ratePercent?: number | null;
  rateBps?: number | null;
  flatAmount?: number | null;
  payoutFrequency?: WealthPartnerCommissionPayoutFrequency;
  overrideRulesJson?: Record<string, unknown> | null;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  notes?: string | null;
  createdBy: string;
}

export interface CreateWealthPartnerBankAccountInput {
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  accountType?: string | null;
  isPrimary?: boolean;
  notes?: string | null;
  createdBy: string;
}

export interface WealthPartnerBusinessSourcingKpis {
  totalOpportunitiesGenerated: number;
  totalDealsGenerated: number;
  totalDisbursement: number;
  revenueGenerated: number;
  conversionRatio: number;
  activeCases: number;
  wonCases: number;
  lostCases: number;
  monthlyBusinessTrend: Array<{ month: string; opportunities: number; deals: number; disbursement: number }>;
  definition: string;
}

export interface WealthPartnerWorkspaceBundle {
  partner: EnterpriseWealthPartnerRecord;
  network: EnterpriseWealthPartnerNetworkMemberRecord[];
  commissions: EnterpriseWealthPartnerCommissionRecord[];
  bankAccounts: EnterpriseWealthPartnerBankAccountRecord[];
  activities: EnterpriseWealthPartnerActivityRecord[];
  businessSourcing: WealthPartnerBusinessSourcingKpis;
  documents: {
    identityKind: WealthPartnerIdentityKind;
    contactId: string | null;
    companyId: string | null;
    note: string;
    items: Array<{
      id: string;
      displayName: string;
      categoryLabel: string;
      typeRef: string;
      status: string;
      originalFilename: string;
      createdAt: string;
    }>;
  };
  /** CO-WP-007 — Legal & Compliance Docket projection (complianceJson + compose). */
  legalCompliance?: WealthPartnerLegalComplianceProjection;
}

/** CO-WP-003 — Network Intelligence (read-only projection). */
export type WealthPartnerNetworkNodeKind =
  | "wealth_partner"
  | "chartered_accountant"
  | "builder"
  | "dsa"
  | "architect"
  | "property_consultant"
  | "financial_consultant"
  | "referral_associate"
  | "company"
  | "other";

export type WealthPartnerNetworkNodeHealth = "active" | "needs_attention" | "inactive";

export type WealthPartnerNetworkPeriodPreset =
  | "all"
  | "month"
  | "quarter"
  | "financial_year";

export interface WealthPartnerNetworkIntelligenceFilters {
  period?: WealthPartnerNetworkPeriodPreset;
  /** YYYY-MM when period=month; YYYY-Qn when period=quarter; FY start year when period=financial_year */
  periodKey?: string;
  productCode?: string | "all";
  branchId?: string | "all";
  region?: string | "all";
  partnerType?: string | "all";
}

export interface WealthPartnerNetworkNodeMetrics {
  businessVolume: number;
  opportunitiesGenerated: number;
  dealsConverted: number;
  conversionRatio: number;
  commissionPayable: number;
  lastActivityAt: string | null;
}

export interface WealthPartnerNetworkTreeNode {
  id: string;
  name: string;
  nodeKind: WealthPartnerNetworkNodeKind;
  partnerTypeLabel: string;
  relationshipType: string;
  relationshipLabel: string;
  status: WealthPartnerNetworkMemberStatus | "root";
  health: WealthPartnerNetworkNodeHealth;
  identityKind: WealthPartnerIdentityKind | "root";
  contactId: string | null;
  companyId: string | null;
  wealthPartnerId: string | null;
  /** Workspace navigation target */
  href: string | null;
  /** Own identity metrics (before child roll-up) */
  own: WealthPartnerNetworkNodeMetrics;
  /** Own + all descendants */
  rolled: WealthPartnerNetworkNodeMetrics;
  children: WealthPartnerNetworkTreeNode[];
}

export interface WealthPartnerNetworkSummary {
  totalNetworkMembers: number;
  activeMembers: number;
  businessGenerated: number;
  opportunities: number;
  deals: number;
  conversionRatio: number;
  commissionPayable: number;
}

export interface WealthPartnerNetworkFilterOptions {
  products: Array<{ value: string; label: string }>;
  branches: Array<{ value: string; label: string }>;
  regions: Array<{ value: string; label: string }>;
  partnerTypes: Array<{ value: string; label: string }>;
  months: Array<{ value: string; label: string }>;
  quarters: Array<{ value: string; label: string }>;
  financialYears: Array<{ value: string; label: string }>;
}

export interface WealthPartnerNetworkIntelligenceBundle {
  rootPartnerId: string;
  rootPartnerCode: string;
  rootPartnerName: string;
  generatedAt: string;
  filtersApplied: WealthPartnerNetworkIntelligenceFilters;
  summary: WealthPartnerNetworkSummary;
  filterOptions: WealthPartnerNetworkFilterOptions;
  tree: WealthPartnerNetworkTreeNode;
  definition: string;
}
