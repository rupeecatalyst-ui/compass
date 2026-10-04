/**
 * CO-CHANAKYA-GPT-ENTERPRISE-READ-RESPONSE-SIZE-050 — GPT Action compact projection.
 * Shapes existing Chanakya enterprise-read compile output; no new intelligence engine.
 */
import "server-only";

import type { ChatGptIntegrationMeta } from "@/types/chatgpt-integration";
import {
  GPT_ACTION_PORTFOLIO_ROW_CAP,
  GPT_ACTION_RESPONSE_SAFE_MAX_BYTES,
  GPT_ENTERPRISE_READ_COMPACT_VIEWS,
  type GptCompactEntitySummary,
  type GptCompactPortfolioDealRow,
  type GptCompactPortfolioList,
  type GptEnterpriseReadCompactView,
  type GptPortfolioActivityFilter,
} from "@/types/chatgpt-enterprise-read-compact";
import type {
  ChanakyaEnterpriseReadCompileResult,
  ChanakyaEnterpriseReadDomain,
  ChanakyaPortfolioBusinessRow,
} from "@/types/chanakya-enterprise-read-context";
import { buildInterventionCards } from "@/lib/chanakya-conversation-intelligence/intervention-cards";

export type GptEnterpriseReadViewResolveInput = {
  viewParam?: string | null;
  requestHint?: string | null;
  dealRef?: string | null;
  opportunityRef?: string | null;
};

export function resolveGptEnterpriseReadView(
  input: GptEnterpriseReadViewResolveInput,
): GptEnterpriseReadCompactView {
  const explicit = (input.viewParam || "").trim().toLowerCase();
  if (
    (GPT_ENTERPRISE_READ_COMPACT_VIEWS as readonly string[]).includes(explicit)
  ) {
    return explicit as GptEnterpriseReadCompactView;
  }

  const q = (input.requestHint || "").toLowerCase();
  const hasDeal = Boolean(input.dealRef?.trim());
  const hasOpp = Boolean(input.opportunityRef?.trim());

  if (/financial|foir|dscr|ltv|dbr|credit analys|analyse financial|analyze financial/.test(q)) {
    return "financials";
  }
  if (/document|pending doc|lod|upload/.test(q)) return "documents";
  if (/what changed|since yesterday|change since|recent change/.test(q)) return "changes";
  if (/accounting|commercial|invoice|gst|payment status/.test(q)) return "commercial";
  if (/lender program|lender fit|product.?lender|which lender/.test(q)) return "lenders";
  if (/dialogue|conversation thread|message history/.test(q)) return "dialogue";
  if (/activity|timeline|recent activit/.test(q)) return "activity";
  if (/attention|stuck|why is|needs attention|idle/.test(q)) return "attention";
  if (
    /how many deals|deal register|deal list|list the deals|show me the deals|which deals|customers in deals|lying in deals|deal numbers|deal-wise|lender-wise|product-wise|wealth partner|partner.?wise|by partner/.test(
      q,
    )
  ) {
    return "portfolio_list";
  }
  if (
    /all (customers|deals)|inactive deals|active deals|portfolio|list deals/.test(q)
  ) {
    return "portfolio_list";
  }

  if (hasDeal) return "deal_summary";
  if (hasOpp) return "opportunity_summary";
  return "portfolio_list";
}

export function resolveGptDomainsForView(
  view: GptEnterpriseReadCompactView,
  explicitDomains?: ChanakyaEnterpriseReadDomain[],
): ChanakyaEnterpriseReadDomain[] | undefined {
  if (explicitDomains?.length) return explicitDomains;

  switch (view) {
    case "portfolio_list":
    case "attention":
      return ["executive", "transactions"];
    case "deal_summary":
    case "opportunity_summary":
      return ["executive", "execution", "relationships", "transactions"];
    case "documents":
      return ["documents", "execution"];
    case "financials":
      return ["credit", "executive", "execution"];
    case "commercial":
      return ["commercial", "execution"];
    case "changes":
      return ["executive", "transactions"];
    case "lenders":
      return ["executive"];
    case "activity":
    case "dialogue":
      return ["execution", "transactions"];
    default:
      return undefined;
  }
}

function compactPortfolioRow(row: ChanakyaPortfolioBusinessRow): GptCompactPortfolioDealRow {
  return {
    customerName: row.customerName ?? row.entityLabel ?? null,
    dealRef: row.dealNumber ?? null,
    opportunityRef: row.opportunityNumber ?? null,
    lender: row.lender ?? null,
    product: row.productLabel ?? null,
    amount: row.requestedAmount ?? null,
    stage: row.stageLabel ?? null,
    activityClassification: row.activityClassification ?? null,
    wealthPartner: row.wealthPartner?.name ?? null,
    pendingDocs: row.pendingDocs ?? null,
    latestActivity: row.latestActivityLabel ?? null,
  };
}

function readPortfolioRegistry(
  transactionAttention: Record<string, unknown> | null,
): {
  registry: {
    allDeals: ChanakyaPortfolioBusinessRow[];
    activeDeals: ChanakyaPortfolioBusinessRow[];
    inactiveDeals: ChanakyaPortfolioBusinessRow[];
    byWealthPartner: Record<string, ChanakyaPortfolioBusinessRow[]>;
    hydration?: { source?: string; availability?: string };
  } | null;
  hydration: {
    source?: string;
    availability?: string;
    pagination?: {
      page?: number;
      limit?: number;
      hasMore?: boolean;
      nextCursor?: string | null;
      totalDeals?: number;
      returnedCount?: number;
    };
  } | null;
} {
  const ta = transactionAttention ?? {};
  const registry = (ta.portfolioBusinessRegistry as {
    allDeals?: ChanakyaPortfolioBusinessRow[];
    activeDeals?: ChanakyaPortfolioBusinessRow[];
    inactiveDeals?: ChanakyaPortfolioBusinessRow[];
    byWealthPartner?: Record<string, ChanakyaPortfolioBusinessRow[]>;
    hydration?: { source?: string; availability?: string; page?: number; pageSize?: number; hasMore?: boolean };
  }) ?? null;
  const hydration =
    (ta.portfolioHydration as {
      source?: string;
      availability?: string;
      pagination?: {
        page?: number;
        limit?: number;
        hasMore?: boolean;
        nextCursor?: string | null;
        totalDeals?: number;
        returnedCount?: number;
      };
    } | undefined) ?? null;
  if (!registry) return { registry: null, hydration };
  return {
    registry: {
      allDeals: registry.allDeals ?? [],
      activeDeals: registry.activeDeals ?? [],
      inactiveDeals: registry.inactiveDeals ?? [],
      byWealthPartner: registry.byWealthPartner ?? {},
      hydration: registry.hydration,
    },
    hydration,
  };
}

/**
 * CO-052 — Portfolio activity filter from natural-language hint.
 * "Currently lying in Deals" = ALL deals. Only explicit "active/inactive" narrows rows.
 */
export function resolveGptPortfolioActivityFilter(
  requestHint?: string | null,
): GptPortfolioActivityFilter {
  const q = (requestHint || "").toLowerCase();
  if (
    /\binactive\s+deals?\b/.test(q) ||
    /\bdeals?\b[^\n]{0,40}\binactive\b/.test(q) ||
    /\binactive\b[^\n]{0,40}\bdeals?\b/.test(q)
  ) {
    return "inactive";
  }
  if (
    /\bactive\s+deals?\b/.test(q) ||
    /\bdeals?\b[^\n]{0,40}\bactive\b/.test(q) ||
    /\bactive\b[^\n]{0,40}\bdeals?\b/.test(q)
  ) {
    return "active";
  }
  return "all";
}

function pickPortfolioRows(
  registry: NonNullable<ReturnType<typeof readPortfolioRegistry>["registry"]>,
  view: GptEnterpriseReadCompactView,
  requestHint?: string | null,
): { rows: ChanakyaPortfolioBusinessRow[]; activityFilter: GptPortfolioActivityFilter } {
  const q = (requestHint || "").toLowerCase();
  if (view === "attention" || /attention|stuck|idle/.test(q)) {
    return {
      activityFilter: "all",
      rows: registry.allDeals.filter(
        (r) =>
          (r.pendingDocs ?? 0) > 0 ||
          r.activityClassification === "inactive" ||
          (r.idleDays ?? 0) >= 5,
      ),
    };
  }
  const activityFilter = resolveGptPortfolioActivityFilter(requestHint);
  if (activityFilter === "inactive") return { activityFilter, rows: registry.inactiveDeals };
  if (activityFilter === "active") return { activityFilter, rows: registry.activeDeals };
  return { activityFilter: "all", rows: registry.allDeals };
}

export function buildGptCompactPortfolioList(input: {
  compiled: ChanakyaEnterpriseReadCompileResult;
  view: GptEnterpriseReadCompactView;
  requestHint?: string | null;
  groupByWealthPartner?: boolean;
  maxRows?: number;
}): GptCompactPortfolioList | null {
  const { registry, hydration } = readPortfolioRegistry(input.compiled.transactionAttention);
  if (!registry) return null;

  const { rows: sourceRows, activityFilter } = pickPortfolioRows(
    registry,
    input.view,
    input.requestHint,
  );
  const paginationMeta = hydration?.pagination;
  const page = paginationMeta?.page ?? 1;
  const pageSize = paginationMeta?.limit ?? sourceRows.length;
  const hasMore = paginationMeta?.hasMore ?? false;
  const nextCursorFromHydration = paginationMeta?.nextCursor ?? null;

  const cap = input.maxRows ?? GPT_ACTION_PORTFOLIO_ROW_CAP;
  const deals = sourceRows.slice(0, cap).map(compactPortfolioRow);

  const aggregates = (input.compiled.transactionAttention?.aggregates ?? {}) as {
    totalDeals?: number | null;
    activeDeals?: number | null;
  };
  const totalDeals =
    aggregates.totalDeals ?? paginationMeta?.totalDeals ?? registry.allDeals.length;
  const activeDeals =
    aggregates.activeDeals ?? registry.activeDeals.length;
  const inactiveDeals =
    aggregates.totalDeals != null && aggregates.activeDeals != null
      ? Math.max(0, aggregates.totalDeals - aggregates.activeDeals)
      : registry.inactiveDeals.length;

  const portfolio: GptCompactPortfolioList = {
    activityFilter,
    summary: {
      totalDeals,
      activeDeals,
      inactiveDeals,
    },
    deals,
    pagination: {
      returnedCount: deals.length,
      page,
      pageSize,
      hasMore: hasMore || sourceRows.length > cap,
      nextCursor:
        hasMore || sourceRows.length > cap
          ? (nextCursorFromHydration ?? String(page + 1))
          : null,
    },
    portfolioHydrationSource:
      (hydration?.source as string | undefined) ??
      registry.hydration?.source ??
      null,
  };

  const groupWp =
    input.groupByWealthPartner ||
    /wealth partner|partner.?wise|by partner/.test((input.requestHint || "").toLowerCase());
  if (groupWp && Object.keys(registry.byWealthPartner).length > 0) {
    portfolio.byWealthPartner = Object.entries(registry.byWealthPartner)
      .slice(0, 20)
      .map(([wealthPartnerId, rows]) => ({
        wealthPartnerId,
        wealthPartnerName: rows[0]?.wealthPartner?.name ?? null,
        dealCount: rows.length,
        deals: rows.slice(0, cap).map(compactPortfolioRow),
      }));
  }

  return portfolio;
}

function pickExecutiveField(
  compiled: ChanakyaEnterpriseReadCompileResult,
  field: string,
): unknown {
  const snap = compiled.transactionExecutiveSnapshot;
  if (snap && field in snap) return (snap as Record<string, unknown>)[field];
  return null;
}

function buildEntitySummaryFromDeal(
  compiled: ChanakyaEnterpriseReadCompileResult,
): GptCompactEntitySummary | null {
  const deal = compiled.deal360;
  if (!deal) return null;

  const exec = deal.slices.executive?.payload ?? {};
  const rel = deal.slices.relationships?.payload ?? {};
  const execution = deal.slices.execution?.payload ?? {};
  const dealPayload = (execution.deal as Record<string, unknown> | undefined) ?? {};

  const entityAttention = compiled.transactionAttention?.entityAttention as
    | { why?: string[]; note?: string; recommendedNextArea?: string }
    | undefined;

  const keyChange = compiled.changeIntelligence?.summary ?? null;

  const recommended = pickExecutiveField(
    compiled,
    "recommendedNextHumanAction",
  ) as { statement?: string } | null;

  return {
    entityKind: "deal",
    customerName:
      (rel.primaryContactName as string | undefined) ??
      (exec.customerName as string | undefined) ??
      null,
    companyName: (rel.companyName as string | undefined) ?? null,
    dealRef: deal.dealNumber,
    opportunityRef:
      (exec.opportunityNumber as string | undefined) ??
      compiled.opportunity360?.opportunityNumber ??
      null,
    lender:
      (dealPayload.primaryCounterpartyName as string | undefined) ??
      (exec.lenderName as string | undefined) ??
      null,
    product: (exec.productLabel as string | undefined) ?? null,
    amount:
      (dealPayload.requestedAmount as number | undefined) ??
      (exec.requestedAmount as number | undefined) ??
      null,
    currentStage:
      (dealPayload.grossStage as string | undefined) ??
      (exec.stageLabel as string | undefined) ??
      null,
    currentStatus:
      (dealPayload.operationalStatus as string | undefined) ??
      (exec.operationalStatus as string | undefined) ??
      null,
    latestActivity:
      (pickExecutiveField(compiled, "latestActivity") as string | undefined) ?? null,
    pendingDocuments:
      (pickExecutiveField(compiled, "pendingDocuments") as number | undefined) ??
      (entityAttention?.why?.find((w) => /document/i.test(w)) ? 1 : null),
    pendingTasks:
      (pickExecutiveField(compiled, "openTasks") as number | undefined) ?? null,
    attentionReason:
      entityAttention?.why?.[0] ?? entityAttention?.note ?? null,
    businessSource:
      (rel.sourceContactName as string | undefined) ??
      (rel.sourceCode as string | undefined) ??
      null,
    wealthPartner: (rel.wealthPartnerName as string | undefined) ?? null,
    keyChange: typeof keyChange === "string" ? keyChange : null,
    recommendedNextAction:
      recommended?.statement ??
      entityAttention?.recommendedNextArea ??
      null,
    provenanceLabel: "chanakya_enterprise_read_compile",
  };
}

function buildEntitySummaryFromOpportunity(
  compiled: ChanakyaEnterpriseReadCompileResult,
): GptCompactEntitySummary | null {
  const opp = compiled.opportunity360;
  if (!opp) return null;

  const exec = opp.slices.executive?.payload ?? {};
  const rel = opp.slices.relationships?.payload ?? {};

  const entityAttention = compiled.transactionAttention?.entityAttention as
    | { why?: string[]; note?: string; recommendedNextArea?: string }
    | undefined;

  const keyChange = compiled.changeIntelligence?.summary ?? null;

  const recommended = pickExecutiveField(
    compiled,
    "recommendedNextHumanAction",
  ) as { statement?: string } | null;

  return {
    entityKind: "opportunity",
    customerName: (rel.primaryContactName as string | undefined) ?? null,
    companyName: (rel.companyName as string | undefined) ?? null,
    dealRef: compiled.deal360?.dealNumber ?? null,
    opportunityRef: opp.opportunityNumber,
    lender: (exec.lenderName as string | undefined) ?? null,
    product: (exec.productLabel as string | undefined) ?? null,
    amount: (exec.requestedAmount as number | undefined) ?? null,
    currentStage: (exec.stageLabel as string | undefined) ?? null,
    currentStatus: (exec.lifecycleStatus as string | undefined) ?? null,
    latestActivity:
      (pickExecutiveField(compiled, "latestActivity") as string | undefined) ?? null,
    pendingDocuments:
      (pickExecutiveField(compiled, "pendingDocuments") as number | undefined) ?? null,
    pendingTasks:
      (pickExecutiveField(compiled, "openTasks") as number | undefined) ?? null,
    attentionReason:
      entityAttention?.why?.[0] ?? entityAttention?.note ?? null,
    businessSource:
      (rel.sourceContactName as string | undefined) ??
      (rel.sourceCode as string | undefined) ??
      null,
    wealthPartner: (rel.wealthPartnerName as string | undefined) ?? null,
    keyChange: typeof keyChange === "string" ? keyChange : null,
    recommendedNextAction:
      recommended?.statement ??
      entityAttention?.recommendedNextArea ??
      null,
    provenanceLabel: "chanakya_enterprise_read_compile",
  };
}

function buildDomainSlice(
  compiled: ChanakyaEnterpriseReadCompileResult,
  view: GptEnterpriseReadCompactView,
): Record<string, unknown> | null {
  switch (view) {
    case "documents": {
      const slice =
        compiled.deal360?.slices.documents ??
        compiled.opportunity360?.slices.documents;
      if (!slice) return null;
      return {
        domain: "documents",
        summary: slice.summary,
        pendingDocuments: slice.payload,
        provenanceLabel: "documents_slice",
      };
    }
    case "financials":
      if (!compiled.creditIntelligence) return null;
      return {
        domain: "financials",
        summary:
          compiled.creditIntelligence.creditAssessment.overallAssessment.summary ??
          "Credit intelligence",
        creditIntelligence: {
          availability: compiled.creditIntelligence.availability,
          overallAssessment:
            compiled.creditIntelligence.creditAssessment.overallAssessment,
          financialAssessment:
            compiled.creditIntelligence.creditAssessment.financialAssessment,
          bankingAssessment:
            compiled.creditIntelligence.creditAssessment.bankingAssessment,
          keyPositives: compiled.creditIntelligence.keyPositives.slice(0, 8),
          keyConcerns: compiled.creditIntelligence.keyConcerns.slice(0, 8),
          creditRatios: compiled.creditIntelligence.creditRatios,
          limitations: compiled.creditIntelligence.limitations,
        },
        provenanceLabel: "credit_intelligence",
      };
    case "commercial": {
      const commercial =
        compiled.deal360?.slices.commercial ??
        compiled.opportunity360?.slices.commercial;
      const commercialAttention = compiled.transactionAttention
        ?.commercialAttention as Record<string, unknown> | undefined;
      return {
        domain: "commercial",
        summary:
          commercial?.summary ?? "Commercial / accounting attention (read-only)",
        commercial: commercial?.payload ?? commercialAttention ?? null,
        provenanceLabel: "commercial_slice",
      };
    }
    case "changes":
      if (!compiled.changeIntelligence) return null;
      return {
        domain: "changes",
        summary: compiled.changeIntelligence.summary,
        changeIntelligence: {
          period: compiled.changeIntelligence.period,
          summary: compiled.changeIntelligence.summary,
          changes: compiled.changeIntelligence.changes.slice(0, 15),
          attentionChanges: compiled.changeIntelligence.attentionChanges.slice(0, 10),
          limitations: compiled.changeIntelligence.limitations,
        },
        provenanceLabel: "change_intelligence",
      };
    case "lenders":
      if (!compiled.productLenderIntelligence) return null;
      return {
        domain: "lenders",
        summary:
          compiled.productLenderIntelligence.productContext.productName ??
          "Product & lender intelligence",
        productLenderIntelligence: {
          productContext: compiled.productLenderIntelligence.productContext,
          assignedLenders:
            compiled.productLenderIntelligence.assignedLenders.slice(0, 10),
          matrixEvidence: {
            mappedLenderCount:
              compiled.productLenderIntelligence.matrixEvidence.mappedLenderCount,
            lenders:
              compiled.productLenderIntelligence.matrixEvidence.lenders.slice(0, 10),
          },
        },
        provenanceLabel: "product_lender_intelligence",
      };
    case "activity": {
      const slice =
        compiled.deal360?.slices.execution ??
        compiled.opportunity360?.slices.execution;
      if (!slice) return null;
      return {
        domain: "activity",
        summary: slice.summary,
        activity: slice.payload,
        provenanceLabel: "execution_slice",
      };
    }
    case "dialogue": {
      const ear =
        compiled.deal360?.slices.execution?.payload ??
        compiled.opportunity360?.slices.execution?.payload;
      const dialogue = (ear as { dialogue?: unknown } | undefined)?.dialogue;
      if (!dialogue) return null;
      return {
        domain: "dialogue",
        summary: "Dialogue evidence (read-only projection)",
        dialogue,
        provenanceLabel: "dialogue_projection",
      };
    }
    case "attention": {
      const entity = compiled.transactionAttention?.entityAttention;
      return {
        domain: "attention",
        summary: "Transaction attention evidence",
        entityAttention: entity ?? null,
        portfolioHighlights: compiled.transactionAttention
          ? {
              needingAttentionCount: (
                compiled.transactionAttention.needingAttention as unknown[]
              )?.length,
            }
          : null,
        provenanceLabel: "transaction_attention",
      };
    }
    default:
      return null;
  }
}

export function buildCompactGptEnterpriseReadResponse(input: {
  meta: ChatGptIntegrationMeta;
  compiled: ChanakyaEnterpriseReadCompileResult;
  view: GptEnterpriseReadCompactView;
  resolvedMode: string;
  requestedEntityRefs: {
    dealRef: string | null;
    opportunityRef: string | null;
  };
  requestHint?: string | null;
}): Record<string, unknown> {
  const base: Record<string, unknown> = {
    ...input.meta,
    responseProfile: "gpt_action_compact",
    compactView: input.view,
    resolvedMode: input.resolvedMode,
    requestedEntityRefs: input.requestedEntityRefs,
    readOnly: true,
    privacy: input.compiled.privacy,
    limitations: input.compiled.limitations.slice(0, 6),
    compiledAt: input.compiled.compiledAt,
    correlationId: input.compiled.correlationId,
    freshness: input.compiled.compiledAt
      ? `live operational records as of ${input.compiled.compiledAt}`
      : null,
  };

  const interventionCards = buildInterventionCards({
    transactionAttention: input.compiled.transactionAttention,
    compiledAt: input.compiled.compiledAt,
    liveTrusted: true,
    productFilter: /business loan|intervention/i.test(input.requestHint || "")
      ? "business_loan"
      : "all",
    limit: 5,
  }).map((card) => ({
    customerName: card.customerName,
    companyName: card.companyName,
    product: card.product,
    lender: card.lender,
    opportunityRef: card.opportunityRef,
    dealRef: card.dealRef,
    stage: card.stage,
    daysInStage: card.daysInStage,
    assignedRcEmployee: card.assignedRcEmployee,
    slaOrExpectedDate: card.slaOrExpectedDate,
    pendingDocuments: card.pendingDocuments,
    pendingTasks: card.pendingTasks,
    latestActivity: card.latestActivity,
    reason: card.reason,
    recommendedNextAction: card.recommendedNextAction,
    lastUpdated: card.lastUpdated,
    freshness: card.freshness,
    href: card.href,
  }));
  if (interventionCards.length > 0) {
    base.interventionCards = interventionCards;
  }

  if (input.view === "portfolio_list" || input.view === "attention") {
    const portfolio = buildGptCompactPortfolioList({
      compiled: input.compiled,
      view: input.view,
      requestHint: input.requestHint,
    });
    if (portfolio) {
      base.portfolio = portfolio;
      base.portfolioRouting = {
        authoritativeAction: "gptActionEnterpriseRead",
        authoritativeSource: "enterprise_deal_registry",
        activityFilter: portfolio.activityFilter,
        activitySemantics:
          portfolio.activityFilter === "all"
            ? "All Deal Registry rows — the word currently does NOT mean active-only."
            : `Filtered to ${portfolio.activityFilter} deals per explicit user wording.`,
        falseZeroRule:
          "If Pipeline or Radar aggregate is zero but portfolio.summary.totalDeals > 0, trust portfolio.deals.",
        readFrom: "data.portfolio.deals and data.portfolio.summary",
        doNotUse: ["gptActionPipeline", "gptActionChanakya"],
      };
    }
    if (input.view === "attention") {
      const attentionSlice = buildDomainSlice(input.compiled, "attention");
      if (attentionSlice) base.attention = attentionSlice;
    }
    return base;
  }

  if (input.view === "deal_summary") {
    const summary = buildEntitySummaryFromDeal(input.compiled);
    if (summary) base.dealSummary = summary;
    return base;
  }

  if (input.view === "opportunity_summary") {
    const summary =
      buildEntitySummaryFromOpportunity(input.compiled) ??
      buildEntitySummaryFromDeal(input.compiled);
    if (summary) base.opportunitySummary = summary;
    return base;
  }

  const slice = buildDomainSlice(input.compiled, input.view);
  if (slice) base.slice = slice;

  if (input.compiled.deal360) {
    const summary = buildEntitySummaryFromDeal(input.compiled);
    if (summary) base.dealSummary = summary;
  } else if (input.compiled.opportunity360) {
    const summary = buildEntitySummaryFromOpportunity(input.compiled);
    if (summary) base.opportunitySummary = summary;
  }

  return base;
}

export function measureJsonUtf8Bytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

export function enforceGptActionResponseSizeGuard(
  payload: Record<string, unknown>,
  maxBytes: number = GPT_ACTION_RESPONSE_SAFE_MAX_BYTES,
): Record<string, unknown> {
  let current = payload;
  let bytes = measureJsonUtf8Bytes(current);
  if (bytes <= maxBytes) {
    return { ...current, responseSizeBytes: bytes, sizeGuardApplied: false };
  }

  const guarded: Record<string, unknown> = {
    ...current,
    sizeGuardApplied: true,
    sizeGuardMaxBytes: maxBytes,
  };
  const portfolio = guarded.portfolio as GptCompactPortfolioList | undefined;

  if (portfolio?.deals?.length) {
    let rowCap = portfolio.deals.length;
    while (rowCap > 1) {
      rowCap = Math.max(1, Math.floor(rowCap * 0.7));
      const trimmed: GptCompactPortfolioList = {
        ...portfolio,
        deals: portfolio.deals.slice(0, rowCap),
        pagination: {
          ...portfolio.pagination,
          returnedCount: Math.min(rowCap, portfolio.deals.length),
          hasMore: true,
          nextCursor:
            portfolio.pagination.nextCursor ??
            String((portfolio.pagination.page ?? 1) + 1),
          sizeGuardApplied: true,
          sizeGuardMaxBytes: maxBytes,
        },
      };
      if (trimmed.byWealthPartner) {
        trimmed.byWealthPartner = trimmed.byWealthPartner.map((group) => ({
          ...group,
          deals: group.deals.slice(0, Math.min(rowCap, group.deals.length)),
        }));
      }
      guarded.portfolio = trimmed;
      bytes = measureJsonUtf8Bytes(guarded);
      if (bytes <= maxBytes) {
        guarded.responseSizeBytes = bytes;
        guarded.sizeGuardNote =
          "Portfolio rows reduced to stay within GPT Action response budget.";
        return guarded;
      }
    }
  }

  delete guarded.slice;
  delete guarded.attention;
  bytes = measureJsonUtf8Bytes(guarded);
  guarded.responseSizeBytes = bytes;
  if (bytes > maxBytes) {
    guarded.sizeGuardNote =
      "Payload still large after compaction; caller should paginate with nextCursor.";
  }
  return guarded;
}
