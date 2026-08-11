/**
 * CO-WP-COM-001 — Partner Commercials / Earnings / Performance DTOs.
 * All monetary and commission values are Catalyst One projections — never Partner-calculated.
 */

export type PartnerCommercialDtoSource =
  | "enterprise_wealth_partner_commercial"
  | "enterprise_partner_earnings_projection"
  | "enterprise_partner_performance_projection";

export type PartnerCommercialTermsDto = {
  commercialStatus: string;
  commercialEffectiveFrom: string | null;
  referralSharePercentLabel: string;
  soleExecutorSharePercentLabel: string;
  jointExecutorSharePercentLabel: string;
  configured: boolean;
  dtoSource: PartnerCommercialDtoSource;
};

export type PartnerCommissionStructureRowDto = {
  structureId: string;
  code: string;
  label: string;
  productLabel: string | null;
  structureKind: string;
  rateSummaryLabel: string;
  payoutFrequencyLabel: string;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  statusLabel: string;
  dtoSource: PartnerCommercialDtoSource;
};

export type PartnerEarningsSummaryDto = {
  currentEarningsLabel: string;
  pendingEarningsLabel: string;
  paidEarningsLabel: string;
  periodLabel: string;
  available: boolean;
  emptyMessage: string | null;
  dtoSource: PartnerCommercialDtoSource;
};

export type PartnerTransactionCommercialRowDto = {
  opportunityId: string;
  reference: string;
  customerDisplayName: string;
  productLabel: string;
  commercialSharePercentLabel: string;
  commercialStatusLabel: string;
  payoutStatusLabel: string;
  updatedAt: string;
  dtoSource: PartnerCommercialDtoSource;
};

export type PartnerPeriodEarningsRowDto = {
  periodKey: string;
  periodLabel: string;
  amountLabel: string;
  statusLabel: string;
  dtoSource: PartnerCommercialDtoSource;
};

export type PartnerCommercialsDeskDto = {
  partnerId: string;
  title: string;
  subtitle: string;
  dtoNotice: string;
  entitlements: {
    executionMode: string;
    moduleAllowed: boolean;
  };
  terms: PartnerCommercialTermsDto;
  commissionStructures: PartnerCommissionStructureRowDto[];
  earnings: PartnerEarningsSummaryDto;
  transactionCommercials: PartnerTransactionCommercialRowDto[];
  periodEarnings: PartnerPeriodEarningsRowDto[];
  emptyStates: {
    structures: { title: string; message: string };
    transactions: { title: string; message: string };
    periodEarnings: { title: string; message: string };
  };
  dtoSource: PartnerCommercialDtoSource;
};

export type PartnerPerformanceMetricDto = {
  id: string;
  label: string;
  valueLabel: string;
  hint: string | null;
  available: boolean;
};

export type PartnerProductMixRowDto = {
  productLabel: string;
  opportunityCount: number;
  sharePercentLabel: string;
};

export type PartnerPerformanceDeskDto = {
  partnerId: string;
  title: string;
  subtitle: string;
  dtoNotice: string;
  entitlements: {
    executionMode: string;
    moduleAllowed: boolean;
  };
  metrics: PartnerPerformanceMetricDto[];
  pipeline: {
    openCount: number;
    closedCount: number;
    totalCount: number;
  };
  productMix: PartnerProductMixRowDto[];
  periodComparison: {
    available: boolean;
    currentPeriodLabel: string;
    priorPeriodLabel: string;
    currentValueLabel: string;
    priorValueLabel: string;
    deltaLabel: string;
    emptyMessage: string | null;
  };
  emptyStates: {
    productMix: { title: string; message: string };
  };
  dtoSource: PartnerCommercialDtoSource;
};
