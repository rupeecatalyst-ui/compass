/**
 * CO-CHANAKYA-ENTERPRISE-READ-COVERAGE-047 — Portfolio business registry enrichment.
 * Joins Radar rows with Opportunity Registry + Deal Registry SSOT for list/portfolio queries.
 * AUTHORIZED BUSINESS DATA = READABLE · CONTACT PII = REDACTED
 */

import "server-only";

import type { ChanakyaRadarDealRow } from "@/lib/chanakya-radar/derive-dashboard";
import { grossStageToLenderCaseStage } from "@/lib/enterprise-deal/deal-lender-stage-map";
import {
  classifyDealActivity,
  type DealActivityClassification,
} from "@/lib/my-deals/classify-deal-activity";
import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import type { DealRegistryRow } from "@/types/deal-registry";
import type {
  ChanakyaAttentionEvidenceRow,
  ChanakyaPortfolioBusinessRow,
} from "@/types/chanakya-enterprise-read-context";
import { redactCustomerContactPiiForAiContext } from "./redact-pii";
import { mapRadarRowToAttentionEvidence } from "./attention-radar-evidence";

export type ChanakyaOpportunityBusinessContext = {
  opportunityId: string;
  opportunityNumber: string | null;
  primaryContactName: string | null;
  companyName: string | null;
  productLabel: string | null;
  requestedAmount: number | null;
  sourceCode: string | null;
  sourceContactName: string | null;
  sourceWealthPartnerId: string | null;
  sourceCampaignLabel: string | null;
  wealthPartnerName: string | null;
  relationshipManagerName: string | null;
};

function pickCustomerName(
  row: ChanakyaRadarDealRow,
  opp?: ChanakyaOpportunityBusinessContext | null,
): string | null {
  return (
    row.borrower?.trim() ||
    opp?.primaryContactName?.trim() ||
    opp?.companyName?.trim() ||
    null
  );
}

function pickCompanyName(
  row: ChanakyaRadarDealRow,
  opp?: ChanakyaOpportunityBusinessContext | null,
): string | null {
  const borrower = row.borrower?.trim() || "";
  const company = opp?.companyName?.trim() || null;
  if (company && company !== borrower) return company;
  return company;
}

export async function loadOpportunityBusinessContextMap(input: {
  organizationId: string;
  opportunityNumbers: string[];
}): Promise<Map<string, ChanakyaOpportunityBusinessContext>> {
  const map = new Map<string, ChanakyaOpportunityBusinessContext>();
  if (!isDatabaseAvailable()) return map;

  const numbers = [
    ...new Set(input.opportunityNumbers.map((n) => n.trim().toUpperCase()).filter(Boolean)),
  ];
  if (numbers.length === 0) return map;

  const rows = await prisma.enterpriseOpportunity.findMany({
    where: {
      organizationId: input.organizationId,
      isDeleted: false,
      OR: numbers.map((n) => ({ opportunityNumber: { equals: n, mode: "insensitive" as const } })),
    },
    select: {
      id: true,
      opportunityNumber: true,
      primaryContactName: true,
      companyName: true,
      productLabel: true,
      requestedAmount: true,
      sourceCode: true,
      sourceContactName: true,
      sourceWealthPartnerId: true,
      sourceCampaignLabel: true,
      relationshipManagerName: true,
    },
  });

  const wpIds = [
    ...new Set(rows.map((r) => r.sourceWealthPartnerId).filter(Boolean) as string[]),
  ];
  const wpNameById = new Map<string, string>();
  if (wpIds.length > 0) {
    const partners = await prisma.enterpriseWealthPartner.findMany({
      where: { organizationId: input.organizationId, id: { in: wpIds }, isDeleted: false },
      select: { id: true, displayName: true, code: true },
    });
    for (const wp of partners) {
      wpNameById.set(wp.id, wp.displayName?.trim() || wp.code?.trim() || wp.id);
    }
  }

  for (const row of rows) {
    const key = (row.opportunityNumber || "").trim().toUpperCase();
    if (!key) continue;
    const ctx: ChanakyaOpportunityBusinessContext = {
      opportunityId: row.id,
      opportunityNumber: row.opportunityNumber,
      primaryContactName: row.primaryContactName,
      companyName: row.companyName,
      productLabel: row.productLabel,
      requestedAmount: row.requestedAmount != null ? Number(row.requestedAmount) : null,
      sourceCode: row.sourceCode,
      sourceContactName: row.sourceContactName,
      sourceWealthPartnerId: row.sourceWealthPartnerId,
      sourceCampaignLabel: row.sourceCampaignLabel,
      wealthPartnerName: row.sourceWealthPartnerId
        ? wpNameById.get(row.sourceWealthPartnerId) ?? null
        : null,
      relationshipManagerName: row.relationshipManagerName,
    };
    map.set(key, ctx);
  }

  return map;
}

async function loadDealActivityMap(input: {
  organizationId: string;
  dealIds: string[];
}): Promise<Map<string, DealActivityClassification>> {
  const map = new Map<string, DealActivityClassification>();
  if (!isDatabaseAvailable()) return map;

  const ids = [...new Set(input.dealIds.filter(Boolean))];
  if (ids.length === 0) return map;

  const deals = await prisma.enterpriseDeal.findMany({
    where: { organizationId: input.organizationId, id: { in: ids }, isDeleted: false },
    select: {
      id: true,
      dealNumber: true,
      grossStage: true,
      subStage: true,
      operationalStatus: true,
      lifecycleStatus: true,
    },
  });

  for (const deal of deals) {
    const lenderCaseStage = grossStageToLenderCaseStage(deal.grossStage);
    const classification = classifyDealActivity({
      id: deal.id,
      enterpriseDealId: deal.id,
      dealId: deal.dealNumber,
      opportunityNumber: "",
      fileNumber: "",
      borrowerName: "",
      contactNumber: "",
      product: "",
      loanAmount: 0,
      loanAmountLabel: "",
      assignedRm: "",
      assignedUsers: [],
      grossStage: deal.grossStage as import("@/types/catalyst-one").PipelineStage,
      lenderCaseStage,
      grossStageLabel: deal.grossStage,
      subStage: deal.subStage || "",
      selectedLender: "",
      expectedRevenue: 0,
      expectedRevenueLabel: "",
      priority: "medium",
      lastActivity: "",
      lastActivityLabel: "",
      dateCreated: "",
      dateCreatedLabel: "",
      lastModified: "",
      lastModifiedLabel: "",
      status: deal.operationalStatus,
      statusLabel: deal.operationalStatus,
      city: "",
      state: "",
      source: "",
      channelPartner: "",
      creditExecutive: "",
    } as unknown as DealRegistryRow);
    map.set(deal.id, classification);
  }

  return map;
}

export function enrichRadarRowToPortfolioBusinessRow(input: {
  row: ChanakyaRadarDealRow;
  opportunityContext?: ChanakyaOpportunityBusinessContext | null;
  activityClassification?: DealActivityClassification | null;
}): ChanakyaPortfolioBusinessRow {
  const base = mapRadarRowToAttentionEvidence(input.row);
  const opp = input.opportunityContext;
  const customerName = pickCustomerName(input.row, opp);
  const companyName = pickCompanyName(input.row, opp);

  const enriched: ChanakyaPortfolioBusinessRow = {
    ...base,
    opportunityId: opp?.opportunityId ?? base.opportunityId ?? null,
    customerName,
    companyName,
    entityLabel: customerName || companyName || base.entityLabel,
    productLabel: input.row.product || opp?.productLabel || null,
    requestedAmount:
      input.row.loanAmount > 0
        ? input.row.loanAmount
        : opp?.requestedAmount ?? null,
    loanAmountLabel: input.row.loanAmountLabel || null,
    activityClassification: input.activityClassification ?? null,
    businessSource: opp
      ? {
          sourceCode: opp.sourceCode,
          sourceContactName: opp.sourceContactName,
          sourceCampaignLabel: opp.sourceCampaignLabel,
        }
      : null,
    wealthPartner: opp?.sourceWealthPartnerId || opp?.wealthPartnerName
      ? {
          id: opp.sourceWealthPartnerId,
          name: opp.wealthPartnerName,
        }
      : null,
    latestActivityLabel: input.row.lastActivityLabel || null,
    relationshipManagerName:
      input.row.assignedRm || opp?.relationshipManagerName || base.ownerLabel,
    openTasks: input.row.openTasks ?? null,
  };

  return redactCustomerContactPiiForAiContext(enriched) as ChanakyaPortfolioBusinessRow;
}

export async function buildEnrichedPortfolioRows(input: {
  organizationId: string;
  rows: ChanakyaRadarDealRow[];
}): Promise<ChanakyaPortfolioBusinessRow[]> {
  const rows = input.rows.slice(0, 500);
  const oppNumbers = rows
    .map((r) => r.opportunityNumber)
    .filter((n): n is string => Boolean(n?.trim()));
  const dealIds = rows.map((r) => r.enterpriseDealId || r.id);

  const [oppMap, activityMap] = await Promise.all([
    loadOpportunityBusinessContextMap({
      organizationId: input.organizationId,
      opportunityNumbers: oppNumbers,
    }),
    loadDealActivityMap({ organizationId: input.organizationId, dealIds }),
  ]);

  return rows.map((row) => {
    const oppKey = (row.opportunityNumber || "").trim().toUpperCase();
    const oppCtx = oppKey ? oppMap.get(oppKey) : undefined;
    const dealId = row.enterpriseDealId || row.id;
    return enrichRadarRowToPortfolioBusinessRow({
      row,
      opportunityContext: oppCtx,
      activityClassification: activityMap.get(dealId) ?? null,
    });
  });
}

export async function buildPortfolioBusinessRegistry(input: {
  organizationId: string;
  rows: ChanakyaRadarDealRow[];
  limit: number;
}): Promise<{
  allDeals: ChanakyaPortfolioBusinessRow[];
  activeDeals: ChanakyaPortfolioBusinessRow[];
  inactiveDeals: ChanakyaPortfolioBusinessRow[];
  byWealthPartner: Record<string, ChanakyaPortfolioBusinessRow[]>;
}> {
  const limit = Math.min(Math.max(input.limit, 1), 200);
  const enriched = await buildEnrichedPortfolioRows({
    organizationId: input.organizationId,
    rows: input.rows.slice(0, limit * 3),
  });

  const activeDeals = enriched
    .filter((r) => r.activityClassification === "active")
    .slice(0, limit);
  const inactiveDeals = enriched
    .filter((r) => r.activityClassification === "inactive")
    .slice(0, limit);

  const byWealthPartner: Record<string, ChanakyaPortfolioBusinessRow[]> = {};
  for (const row of enriched) {
    const wpId = row.wealthPartner?.id;
    if (!wpId) continue;
    if (!byWealthPartner[wpId]) byWealthPartner[wpId] = [];
    if (byWealthPartner[wpId].length < limit) byWealthPartner[wpId].push(row);
  }

  return {
    allDeals: enriched.slice(0, limit),
    activeDeals,
    inactiveDeals,
    byWealthPartner,
  };
}
