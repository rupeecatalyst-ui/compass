/**
 * CO-CHANAKYA-GPT-ENTERPRISE-READ-RESPONSE-SIZE-050 — GPT Action compact response views.
 * Shapes existing compile evidence; does not introduce new business calculations.
 */

export const GPT_ENTERPRISE_READ_COMPACT_VIEWS = [
  "portfolio_list",
  "deal_summary",
  "opportunity_summary",
  "documents",
  "activity",
  "dialogue",
  "financials",
  "lenders",
  "commercial",
  "attention",
  "changes",
] as const;

export type GptEnterpriseReadCompactView =
  (typeof GPT_ENTERPRISE_READ_COMPACT_VIEWS)[number];

/** Conservative UTF-8 byte budget for ChatGPT GPT Actions (pre-empt ResponseTooLargeError). */
export const GPT_ACTION_RESPONSE_SAFE_MAX_BYTES = 90_000;

export const GPT_ACTION_PORTFOLIO_ROW_CAP = 50;

export type GptCompactPortfolioDealRow = {
  customerName: string | null;
  dealRef: string | null;
  opportunityRef: string | null;
  lender: string | null;
  product: string | null;
  amount: number | null;
  stage: string | null;
  activityClassification: "active" | "inactive" | null;
  wealthPartner: string | null;
  pendingDocs: number | null;
  latestActivity: string | null;
};

export type GptCompactPortfolioPagination = {
  returnedCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  nextCursor: string | null;
  sizeGuardApplied?: boolean;
  sizeGuardMaxBytes?: number;
};

export type GptPortfolioActivityFilter = "all" | "active" | "inactive";

export type GptCompactPortfolioList = {
  /** SSOT activity filter applied to `deals` rows — "currently" alone does NOT mean active. */
  activityFilter: GptPortfolioActivityFilter;
  summary: {
    totalDeals: number;
    activeDeals: number;
    inactiveDeals: number;
  };
  deals: GptCompactPortfolioDealRow[];
  pagination: GptCompactPortfolioPagination;
  byWealthPartner?: Array<{
    wealthPartnerId: string;
    wealthPartnerName: string | null;
    dealCount: number;
    deals: GptCompactPortfolioDealRow[];
  }>;
  portfolioHydrationSource?: string | null;
};

export type GptCompactEntitySummary = {
  entityKind: "deal" | "opportunity";
  customerName: string | null;
  companyName: string | null;
  dealRef: string | null;
  opportunityRef: string | null;
  lender: string | null;
  product: string | null;
  amount: number | null;
  currentStage: string | null;
  currentStatus: string | null;
  latestActivity: string | null;
  pendingDocuments: number | null;
  pendingTasks: number | null;
  attentionReason: string | null;
  businessSource: string | null;
  wealthPartner: string | null;
  keyChange: string | null;
  recommendedNextAction: string | null;
  provenanceLabel: string;
};
