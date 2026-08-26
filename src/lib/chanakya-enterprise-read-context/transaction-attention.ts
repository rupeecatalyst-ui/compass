/**
 * CO-CHANAKYA-ENTERPRISE-READ-CONTEXT-002
 * Transaction-level attention lists from existing Radar / EBI evidence (no new risk formulas).
 */

import "server-only";

import { loadEbiDataContext } from "@/lib/enterprise-business-intelligence/snapshot";
import { composeBusinessIntelligenceSnapshot } from "@/lib/enterprise-business-intelligence/compose";
import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import type { ChanakyaAttentionEvidenceRow } from "@/types/chanakya-enterprise-read-context";
import { CHANAKYA_FIELD_AVAILABILITY } from "@/types/chanakya-enterprise-read-context";
import { redactCustomerContactPiiForAiContext } from "./redact-pii";

function mapRadarRow(
  r: ReturnType<typeof loadEbiDataContext>["radar"]["rows"][number],
  why: string[],
): ChanakyaAttentionEvidenceRow {
  return {
    entityKind: "deal",
    entityId: r.enterpriseDealId || r.id,
    entityLabel: r.borrower || null,
    opportunityNumber: r.opportunityNumber ?? null,
    dealNumber: r.dealId || null,
    stageLabel: r.stageLabel || null,
    lender: r.lender || null,
    idleDays: r.idleDays,
    pendingDocs: r.pendingDocs,
    quadrant: r.quadrant || null,
    classificationReason: r.classificationReason || null,
    why,
    provenance: "chanakya_radar_dashboard + enterprise_business_intelligence",
  };
}

export function buildTransactionAttentionContext(input: {
  organizationId: string;
  limit?: number;
}): Record<string, unknown> {
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
  const ctx = loadEbiDataContext();
  const ebi = composeBusinessIntelligenceSnapshot();
  const rows = ctx.radar.rows;

  const inactive = rows
    .filter((r) => r.idleDays >= 5 && !r.isHealthyWaiting)
    .slice(0, limit)
    .map((r) =>
      mapRadarRow(r, [
        `Idle ${r.idleDays} day(s)`,
        r.isHealthyWaiting ? "Healthy waiting" : "Not healthy-waiting",
        r.classificationReason || "Radar classification",
      ]),
    );

  const awaitingDocuments = rows
    .filter((r) => r.pendingDocs > 0)
    .slice(0, limit)
    .map((r) =>
      mapRadarRow(r, [
        `${r.pendingDocs} pending document(s)`,
        r.classificationReason || "Document gap observed on Radar row",
      ]),
    );

  const awaitingLender = rows
    .filter(
      (r) =>
        /login|credit|pending|await/i.test(r.stageLabel) ||
        r.quadrant === "follow_up_required" ||
        r.quadrant === "needs_attention",
    )
    .slice(0, limit)
    .map((r) =>
      mapRadarRow(r, [
        `Stage: ${r.stageLabel}`,
        `Quadrant: ${r.quadrant}`,
        r.classificationReason || "Awaiting lender / follow-up signal",
      ]),
    );

  const atRisk = rows
    .filter((r) => r.quadrant === "at_risk" || (r.idleDays >= 7 && !r.isHealthyWaiting))
    .slice(0, limit)
    .map((r) =>
      mapRadarRow(r, [
        `Quadrant: ${r.quadrant}`,
        `Idle ${r.idleDays}d`,
        r.classificationReason || "Radar at-risk / prolonged idle",
      ]),
    );

  const recentlyDisbursed = rows
    .filter((r) => /disburs/i.test(r.stageLabel) || /disburs/i.test(r.status))
    .slice(0, limit)
    .map((r) =>
      mapRadarRow(r, [`Stage/status indicates disbursement: ${r.stageLabel || r.status}`]),
    );

  return redactCustomerContactPiiForAiContext({
    organizationId: input.organizationId,
    asOf: ctx.asOf,
    isLiveTrusted: ctx.isLiveTrusted,
    aggregates: {
      overdueTasks: ebi.operational.overdueTasks,
      inactiveOpportunities: ebi.operational.inactiveOpportunities,
      dealsAwaitingDocuments: ebi.operational.dealsAwaitingDocuments,
      dealsAwaitingLenderAction: ebi.operational.dealsAwaitingLenderAction,
      activeOpportunities: ebi.executive.activeOpportunities,
      activeDeals: ebi.executive.activeDeals,
    },
    lists: {
      needingAttention: atRisk,
      inactiveOver5Days: inactive,
      awaitingDocuments,
      awaitingLenderAction: awaitingLender,
      recentlyDisbursed,
    },
    note: "Lists are evidence projections from Radar/EBI — not a new risk engine. Empty lists mean NOT AVAILABLE evidence in this portfolio snapshot, not invented zeros for unknown stores.",
    provenance: "loadEbiDataContext → Chanakya Radar rows + EBI operational KPIs",
  });
}

export async function buildCommercialAttentionContext(input: {
  organizationId: string;
  limit?: number;
}): Promise<Record<string, unknown>> {
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
  if (!isDatabaseAvailable()) {
    return {
      status: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      note: "Database unavailable — commercial attention NOT AVAILABLE.",
      provenance: "enterprise_accounting_invoice",
    };
  }

  try {
    const outstanding = await prisma.enterpriseAccountingInvoice.findMany({
      where: {
        organizationId: input.organizationId,
        documentStatus: { in: ["raised", "shared"] },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        invoiceNumber: true,
        documentStatus: true,
        invoiceTotal: true,
        netReceivable: true,
        opportunityId: true,
        dealId: true,
        raisedAt: true,
        updatedAt: true,
      },
    });

    return redactCustomerContactPiiForAiContext({
      status:
        outstanding.length > 0
          ? CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
          : CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      outstandingInvoices: outstanding.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        documentStatus: inv.documentStatus,
        invoiceTotal: inv.invoiceTotal != null ? Number(inv.invoiceTotal) : null,
        netReceivable: inv.netReceivable != null ? Number(inv.netReceivable) : null,
        opportunityId: inv.opportunityId,
        dealId: inv.dealId,
        raisedAt: inv.raisedAt,
        updatedAt: inv.updatedAt,
      })),
      count: outstanding.length,
      provenance: "enterprise_accounting_invoice (read-only)",
      note: "Outstanding = raised/shared documentStatus. Payment ledger depth is NOT fully expanded in this sprint.",
    });
  } catch {
    return {
      status: CHANAKYA_FIELD_AVAILABILITY.UNKNOWN,
      note: "Commercial invoice query failed — UNKNOWN.",
      provenance: "enterprise_accounting_invoice",
    };
  }
}
