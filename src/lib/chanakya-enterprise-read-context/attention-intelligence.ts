/**
 * CO-CHANAKYA-003B — Transaction attention intelligence (async joins).
 * Joins existing Radar / EBI / ETE / document / phase / post-disb / SDE / accounting evidence.
 * No new risk formulas — explain only observable signals.
 */

import "server-only";

import { loadEbiDataContext } from "@/lib/enterprise-business-intelligence/snapshot";
import { composeBusinessIntelligenceSnapshot } from "@/lib/enterprise-business-intelligence/compose";
import { getDocumentRequestState } from "@/lib/document-requests/store";
import { buildChanakyaDocumentIntelligencePack } from "@/lib/chanakya-document-intelligence";
import { isDatabaseAvailable } from "@server/lib/prisma";
import type {
  ChanakyaAttentionDomain,
  ChanakyaAttentionEvidenceRow,
  ChanakyaAttentionReasonEvidence,
  ChanakyaPortfolioBusinessRow,
  ChanakyaPortfolioHydrationMeta,
} from "@/types/chanakya-enterprise-read-context";
import { CHANAKYA_FIELD_AVAILABILITY, CHANAKYA_PORTFOLIO_PAGE_MAX } from "@/types/chanakya-enterprise-read-context";
import {
  projectDocumentReadinessEvidence,
  projectPhaseReadinessEvidence,
  projectPostDisbursementConfirmationEvidence,
  projectEarEvidence,
} from "./evidence-projections";
import {
  appendCommercialAttentionReasons,
  projectCommercialAccountingContext,
} from "./commercial-projections";
import { redactCustomerContactPiiForAiContext } from "./redact-pii";
import {
  buildEnrichedPortfolioRows,
  buildPortfolioBusinessRegistry,
  enrichRadarRowToPortfolioBusinessRow,
} from "./portfolio-business-intelligence";
import { resolvePortfolioRadarRows } from "./portfolio-hydration";
import {
  attentionExplanationStatus,
  buildAttentionReasonsFromRadarRow,
  collectAttentionSources,
  earliestAttentionTimestamp,
  inferRecommendedNextArea,
  mapRadarRowToAttentionEvidence,
  pushAttentionReason,
  radarRowMatchesDeal,
  radarRowMatchesOpportunity,
  sortAttentionRows,
} from "./attention-radar-evidence";

export {
  attentionExplanationStatus,
  buildAttentionReasonsFromRadarRow,
  mapRadarRowToAttentionEvidence,
  sortAttentionRows,
} from "./attention-radar-evidence";

async function appendAsyncEntityEvidence(input: {
  organizationId: string;
  row: import("@/lib/chanakya-radar/derive-dashboard").ChanakyaRadarDealRow | null;
  opportunityId?: string | null;
  opportunityNumber?: string | null;
  dealId?: string | null;
  dealStage?: string | null;
  dealSubStage?: string | null;
  disbursedAt?: Date | string | null;
  opportunityRecord?: Record<string, unknown> | null;
  reasons: ChanakyaAttentionReasonEvidence[];
  domainBreakdown: Partial<Record<ChanakyaAttentionDomain, ChanakyaAttentionReasonEvidence[]>>;
}) {
  const dealId = input.dealId || input.row?.enterpriseDealId || input.row?.id || null;

  if (input.opportunityId && input.opportunityRecord) {
    const lodState = getDocumentRequestState(input.opportunityId);
    const docIntel = await buildChanakyaDocumentIntelligencePack({
      opportunityId: input.opportunityId,
    });
    const documentIntelligenceSummary = {
      status: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
      documentsWithReadableText: docIntel.documentsWithReadableText,
      documentsRequiringOcr: docIntel.documentsRequiringOcr,
      structuredFactCount: docIntel.structuredFacts.length,
      provenance: "chanakya_document_intelligence",
    };
    const docEvidence = projectDocumentReadinessEvidence({
      lodItems: lodState.lodItems ?? [],
      opportunity: input.opportunityRecord,
      documentIntelligenceSummary,
    });

    const readiness = docEvidence.documentReadiness as Record<string, unknown> | undefined;
    if (
      docEvidence.status === CHANAKYA_FIELD_AVAILABILITY.AVAILABLE &&
      readiness &&
      typeof readiness.pending === "number" &&
      readiness.pending > 0
    ) {
      pushAttentionReason(input.reasons, input.domainBreakdown, {
        domain: "documents",
        statement: `${readiness.pending} document requirement(s) pending (${readiness.criticalPending ?? 0} critical).`,
        source: "document_requests/readiness.deriveOpportunityDocumentReadiness",
        entityId: input.opportunityId,
        observedAt: null,
        availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
      });
    }

    const phaseEvidence = projectPhaseReadinessEvidence({
      hasContact: Boolean(input.opportunityRecord.primaryContactId),
      hasOpportunity: true,
      customerName:
        typeof input.opportunityRecord.primaryContactName === "string"
          ? input.opportunityRecord.primaryContactName
          : null,
      productLabel:
        typeof input.opportunityRecord.productLabel === "string"
          ? input.opportunityRecord.productLabel
          : null,
      lifeFinalized: Boolean(input.opportunityRecord.lifeFinalized),
    });

    if (
      phaseEvidence.status === CHANAKYA_FIELD_AVAILABILITY.AVAILABLE &&
      typeof phaseEvidence.overallPct === "number" &&
      phaseEvidence.overallPct < 100
    ) {
      const phases =
        (phaseEvidence.phases as Array<{
          label: string;
          pct: number;
          criticalMissingCount: number;
        }>) ?? [];
      const weak = phases.find((p) => p.criticalMissingCount > 0 || p.pct < 70);
      pushAttentionReason(input.reasons, input.domainBreakdown, {
        domain: "credit_readiness",
        statement: weak
          ? `Phase readiness: ${weak.label} at ${weak.pct}% (${weak.criticalMissingCount} critical gap(s)).`
          : `Overall transaction readiness at ${phaseEvidence.overallPct}% (advisory).`,
        source: "enterprise_phase_readiness/derive.derivePhaseReadiness",
        entityId: input.opportunityId,
        observedAt: null,
        availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
      });
    }
  }

  if (dealId) {
    const postDisb = await projectPostDisbursementConfirmationEvidence({
      organizationId: input.organizationId,
      dealId,
      grossStage: input.dealStage ?? input.row?.stageLabel ?? null,
      subStage: input.dealSubStage ?? input.row?.subStageLabel ?? null,
      disbursedAt: input.disbursedAt ?? null,
    });

    if (postDisb.confirmationState === "confirmation_pending") {
      pushAttentionReason(input.reasons, input.domainBreakdown, {
        domain: "post_disbursement",
        statement: "Post-disbursement confirmation is pending.",
        source: "post_disbursement_confirmation + enterprise_activity_registry",
        entityId: dealId,
        observedAt:
          (postDisb.serviceEvents as Array<{ occurredAt?: string }> | undefined)?.[0]
            ?.occurredAt ?? null,
        availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
      });
    }

    if (isDatabaseAvailable()) {
      try {
        const commercial = await projectCommercialAccountingContext({
          organizationId: input.organizationId,
          opportunityId: input.opportunityId,
          dealId,
          dealStage: input.dealStage ?? input.row?.stageLabel ?? null,
          dealSubStage: input.dealSubStage ?? input.row?.subStageLabel ?? null,
          disbursedAt: input.disbursedAt ?? null,
          limit: 20,
        });
        appendCommercialAttentionReasons({
          commercial,
          reasons: input.reasons,
          domainBreakdown: input.domainBreakdown,
        });
      } catch {
        /* optional — do not fabricate */
      }
    }

    const ear = await projectEarEvidence({
      organizationId: input.organizationId,
      opportunityId: input.opportunityId,
      dealId,
    });
    if (
      ear.status === CHANAKYA_FIELD_AVAILABILITY.AVAILABLE &&
      typeof ear.latestOccurredAt === "string" &&
      input.row &&
      input.row.idleDays >= 5 &&
      !input.row.isHealthyWaiting
    ) {
      pushAttentionReason(input.reasons, input.domainBreakdown, {
        domain: "activity",
        statement: `Latest operational activity recorded ${ear.latestOccurredAt}.`,
        source: "enterprise_activity_registry",
        entityId:
          (ear.recent as Array<{ entityId?: string }> | undefined)?.[0]?.entityId ?? dealId,
        observedAt: ear.latestOccurredAt,
        availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
      });
    }
  }
}

export async function buildEntityAttentionExplanation(input: {
  organizationId: string;
  opportunityRef?: string | null;
  opportunityId?: string | null;
  opportunityNumber?: string | null;
  dealRef?: string | null;
  dealId?: string | null;
  dealNumber?: string | null;
  dealStage?: string | null;
  dealSubStage?: string | null;
  disbursedAt?: Date | string | null;
  opportunityRecord?: Record<string, unknown> | null;
  radarRows?: import("@/lib/chanakya-radar/derive-dashboard").ChanakyaRadarDealRow[];
}): Promise<Record<string, unknown>> {
  const ctx = loadEbiDataContext();
  const rows = input.radarRows ?? ctx.radar.rows;

  let matched: typeof rows = [];
  if (input.dealRef?.trim() || input.dealId) {
    const ref = input.dealRef?.trim() || input.dealNumber || input.dealId || "";
    matched = rows.filter((r) => radarRowMatchesDeal(r, ref, input.dealId));
  } else if (input.opportunityRef?.trim() || input.opportunityNumber) {
    const ref = input.opportunityRef?.trim() || input.opportunityNumber || "";
    matched = rows.filter((r) => radarRowMatchesOpportunity(r, ref));
  }

  const primaryRow = matched[0] ?? null;
  const reasons: ChanakyaAttentionReasonEvidence[] = [];
  const domainBreakdown: Partial<
    Record<ChanakyaAttentionDomain, ChanakyaAttentionReasonEvidence[]>
  > = {};

  if (primaryRow) {
    const radarBuilt = buildAttentionReasonsFromRadarRow(primaryRow);
    reasons.push(...radarBuilt.reasons);
    for (const [domain, list] of Object.entries(radarBuilt.domainBreakdown)) {
      const key = domain as ChanakyaAttentionDomain;
      domainBreakdown[key] = [...(domainBreakdown[key] ?? []), ...(list ?? [])];
    }
  }

  await appendAsyncEntityEvidence({
    organizationId: input.organizationId,
    row: primaryRow,
    opportunityId: input.opportunityId,
    opportunityNumber: input.opportunityNumber ?? input.opportunityRef ?? null,
    dealId: input.dealId ?? primaryRow?.enterpriseDealId ?? primaryRow?.id ?? null,
    dealStage: input.dealStage,
    dealSubStage: input.dealSubStage,
    disbursedAt: input.disbursedAt,
    opportunityRecord: input.opportunityRecord,
    reasons,
    domainBreakdown,
  });

  const entityKind: "opportunity" | "deal" =
    input.dealId || input.dealRef ? "deal" : "opportunity";
  const entityId =
    input.dealId ||
    input.opportunityId ||
    primaryRow?.enterpriseDealId ||
    primaryRow?.id ||
    input.dealRef ||
    input.opportunityRef ||
    "unknown";

  const attentionLabel =
    primaryRow?.quadrant === "at_risk"
      ? "AT_RISK"
      : primaryRow?.quadrant
        ? primaryRow.quadrant.toUpperCase()
        : reasons.length > 0
          ? "ATTENTION"
          : CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE;

  const explanation =
    reasons.length > 0
      ? {
          attention: attentionLabel,
          why: reasons.map((r) => r.statement),
          domainBreakdown,
          reasons,
          sources: collectAttentionSources(reasons),
          attentionSince: earliestAttentionTimestamp(reasons, primaryRow?.lastActivity ?? null),
          ownerLabel: primaryRow?.assignedRm ?? null,
          recommendedNextArea: inferRecommendedNextArea(
            domainBreakdown,
            primaryRow?.recommendation ?? null,
          ),
          provenance: "joined_existing_engines",
        }
      : {
          attention: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
          why: [] as string[],
          note: "No observable attention evidence for this entity scope in the current snapshot.",
          provenance: "joined_existing_engines",
        };

  return redactCustomerContactPiiForAiContext({
    entityKind,
    entityId,
    opportunityId: input.opportunityId ?? null,
    opportunityNumber:
      input.opportunityNumber ?? input.opportunityRef ?? primaryRow?.opportunityNumber ?? null,
    dealId: input.dealId ?? primaryRow?.enterpriseDealId ?? null,
    dealNumber: input.dealNumber ?? input.dealRef ?? primaryRow?.dealId ?? null,
    radarMatchCount: matched.length,
    matchedDeals: matched.map((r) => mapRadarRowToAttentionEvidence(r)),
    ...explanation,
  });
}

export async function buildPortfolioAttentionLists(input: {
  organizationId: string;
  limit: number;
  page?: number;
}): Promise<{
  needingAttention: ChanakyaPortfolioBusinessRow[];
  inactiveOver5Days: ChanakyaPortfolioBusinessRow[];
  awaitingDocuments: ChanakyaPortfolioBusinessRow[];
  awaitingLenderAction: ChanakyaPortfolioBusinessRow[];
  recentlyDisbursed: ChanakyaPortfolioBusinessRow[];
  priorityList: ChanakyaPortfolioBusinessRow[];
  portfolioBusinessRegistry: Awaited<ReturnType<typeof buildPortfolioBusinessRegistry>>;
  portfolioHydration: ChanakyaPortfolioHydrationMeta;
}> {
  const limit = Math.min(Math.max(input.limit, 1), CHANAKYA_PORTFOLIO_PAGE_MAX);
  const page = Math.max(1, input.page ?? 1);

  const resolved = await resolvePortfolioRadarRows({
    organizationId: input.organizationId,
    limit,
    page,
  });

  const rows = resolved.rows;
  const hydration = resolved.hydration;

  if (hydration.availability === "FALLBACK_FAILURE") {
    return {
      needingAttention: [],
      inactiveOver5Days: [],
      awaitingDocuments: [],
      awaitingLenderAction: [],
      recentlyDisbursed: [],
      priorityList: [],
      portfolioBusinessRegistry: {
        allDeals: [],
        activeDeals: [],
        inactiveDeals: [],
        byWealthPartner: {},
        hydration,
      },
      portfolioHydration: hydration,
    };
  }

  const [enriched, portfolioBusinessRegistry] = await Promise.all([
    buildEnrichedPortfolioRows({ organizationId: input.organizationId, rows }),
    buildPortfolioBusinessRegistry({
      organizationId: input.organizationId,
      rows,
      limit,
      hydration,
    }),
  ]);

  const enrichedByDealId = new Map<string, ChanakyaPortfolioBusinessRow>();
  for (const row of enriched) {
    enrichedByDealId.set(row.dealId || row.entityId, row);
  }
  const pick = (radarRow: (typeof rows)[number]): ChanakyaPortfolioBusinessRow => {
    const id = radarRow.enterpriseDealId || radarRow.id;
    return (
      enrichedByDealId.get(id) ??
      enrichRadarRowToPortfolioBusinessRow({ row: radarRow })
    );
  };

  const inactive = sortAttentionRows(
    rows
      .filter((r) => r.idleDays >= 5 && !r.isHealthyWaiting)
      .map((r) => pick(r)),
  ).slice(0, limit);

  const awaitingDocuments = sortAttentionRows(
    enriched.filter((r) => (r.pendingDocs ?? 0) > 0),
  ).slice(0, limit);

  const awaitingLender = sortAttentionRows(
    enriched.filter(
      (r) =>
        /login|credit|pending|await/i.test(r.stageLabel || "") ||
        r.quadrant === "follow_up_required" ||
        r.quadrant === "needs_attention",
    ),
  ).slice(0, limit);

  const atRisk = sortAttentionRows(
    rows
      .filter(
        (r) => r.quadrant === "at_risk" || (r.idleDays >= 7 && !r.isHealthyWaiting),
      )
      .map((r) => pick(r)),
  ).slice(0, limit);

  const recentlyDisbursed = enriched
    .filter((r) => /disburs/i.test(r.stageLabel || ""))
    .slice(0, limit);

  const priorityList = sortAttentionRows(
    enriched.filter((r) => r.why.length > 0 || r.quadrant === "at_risk"),
  ).slice(0, limit);

  return {
    needingAttention: atRisk,
    inactiveOver5Days: inactive,
    awaitingDocuments,
    awaitingLenderAction: awaitingLender,
    recentlyDisbursed,
    priorityList,
    portfolioBusinessRegistry,
    portfolioHydration: hydration,
  };
}

export async function buildTransactionAttentionContext(input: {
  organizationId: string;
  limit?: number;
  portfolioPage?: number;
  opportunityRef?: string | null;
  opportunityId?: string | null;
  opportunityNumber?: string | null;
  dealRef?: string | null;
  dealId?: string | null;
  dealNumber?: string | null;
  dealStage?: string | null;
  dealSubStage?: string | null;
  disbursedAt?: Date | string | null;
  opportunityRecord?: Record<string, unknown> | null;
}): Promise<Record<string, unknown>> {
  const limit = Math.min(Math.max(input.limit ?? 25, 1), CHANAKYA_PORTFOLIO_PAGE_MAX);
  const ctx = loadEbiDataContext();
  const ebi = composeBusinessIntelligenceSnapshot();
  const lists = await buildPortfolioAttentionLists({
    organizationId: input.organizationId,
    limit,
    page: input.portfolioPage,
  });

  const hasEntityScope = Boolean(
    input.opportunityRef?.trim() ||
      input.opportunityId ||
      input.dealRef?.trim() ||
      input.dealId,
  );

  const entityAttention = hasEntityScope
    ? await buildEntityAttentionExplanation({
        organizationId: input.organizationId,
        opportunityRef: input.opportunityRef,
        opportunityId: input.opportunityId,
        opportunityNumber: input.opportunityNumber,
        dealRef: input.dealRef,
        dealId: input.dealId,
        dealNumber: input.dealNumber,
        dealStage: input.dealStage,
        dealSubStage: input.dealSubStage,
        disbursedAt: input.disbursedAt,
        opportunityRecord: input.opportunityRecord,
      })
    : {
        status: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
        note: "Provide opportunityRef or dealRef for entity-scoped attention explanation.",
      };

  return redactCustomerContactPiiForAiContext({
    organizationId: input.organizationId,
    asOf: ctx.asOf,
    isLiveTrusted: lists.portfolioHydration.isLiveTrusted,
    portfolioHydration: lists.portfolioHydration,
    aggregates: {
      overdueTasks: ebi.operational.overdueTasks,
      inactiveOpportunities: ebi.operational.inactiveOpportunities,
      dealsAwaitingDocuments: ebi.operational.dealsAwaitingDocuments,
      dealsAwaitingLenderAction: ebi.operational.dealsAwaitingLenderAction,
      activeOpportunities: ebi.executive.activeOpportunities,
      activeDeals:
        lists.portfolioHydration.source === "enterprise_deal_registry" &&
        lists.portfolioHydration.availability === "AVAILABLE"
          ? Math.max(
              ebi.executive.activeDeals,
              lists.portfolioBusinessRegistry.activeDeals.length,
            )
          : lists.portfolioHydration.availability === "FALLBACK_FAILURE"
            ? null
            : ebi.executive.activeDeals,
      totalDeals: lists.portfolioHydration.pagination.totalDeals,
      returnedDeals: lists.portfolioHydration.pagination.returnedCount,
      portfolioHasMore: lists.portfolioHydration.pagination.hasMore,
      portfolioNextCursor: lists.portfolioHydration.pagination.nextCursor,
    },
    lists: {
      needingAttention: lists.needingAttention,
      inactiveOver5Days: lists.inactiveOver5Days,
      awaitingDocuments: lists.awaitingDocuments,
      awaitingLenderAction: lists.awaitingLenderAction,
      recentlyDisbursed: lists.recentlyDisbursed,
      priorityList: lists.priorityList,
    },
    portfolioBusinessRegistry: lists.portfolioBusinessRegistry,
    entityAttention,
    note:
      lists.portfolioHydration.availability === "FALLBACK_FAILURE"
        ? lists.portfolioHydration.note
        : "Lists and entity explanations join Radar/EBI or Enterprise Deal Registry fallback + 047 enrichment — no new risk engine. Empty evidence means NOT_AVAILABLE or TRUE_EMPTY, not invented reasons.",
    provenance: "loadEbiDataContext → Chanakya Radar + EBI + attention-intelligence joins",
  });
}
