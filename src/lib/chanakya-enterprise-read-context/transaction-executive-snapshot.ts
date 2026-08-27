/**
 * CO-CHANAKYA-026 — Transaction executive snapshot loader (compile integration).
 */

import "server-only";

import type { ChanakyaEnterpriseReadCompileResult } from "@/types/chanakya-enterprise-read-context";
import type { ChanakyaAttentionEvidenceRow } from "@/types/chanakya-enterprise-read-context";
import { redactCustomerContactPiiForAiContext } from "./redact-pii";
import {
  composeTransactionExecutiveSnapshot,
  type TransactionExecutiveSnapshotComposeInput,
} from "./transaction-executive-snapshot-core";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function extractOpportunity(
  result: Pick<ChanakyaEnterpriseReadCompileResult, "opportunity360" | "deal360">,
): Record<string, unknown> | null {
  const fromOpp = asRecord(
    result.opportunity360?.slices.transactions?.payload?.opportunity,
  );
  if (fromOpp) return fromOpp;
  return null;
}

function extractDeals(
  result: Pick<ChanakyaEnterpriseReadCompileResult, "opportunity360" | "deal360">,
): Array<Record<string, unknown>> {
  const oppDeals = result.opportunity360?.slices.execution?.payload?.deals;
  if (Array.isArray(oppDeals) && oppDeals.length) {
    return oppDeals as Array<Record<string, unknown>>;
  }
  const dealPayload = asRecord(result.deal360?.slices.execution?.payload?.deal);
  return dealPayload ? [dealPayload] : [];
}

function extractPrimaryDeal(
  result: Pick<ChanakyaEnterpriseReadCompileResult, "deal360">,
): Record<string, unknown> | null {
  return asRecord(result.deal360?.slices.execution?.payload?.deal);
}

function extractRadarRow(
  entityAttention: Record<string, unknown> | null,
): ChanakyaAttentionEvidenceRow | null {
  if (!entityAttention) return null;
  const matched = entityAttention.matchedDeals;
  if (Array.isArray(matched) && matched.length > 0) {
    return matched[0] as ChanakyaAttentionEvidenceRow;
  }
  return null;
}

function extractPostDisbursement(
  result: Pick<ChanakyaEnterpriseReadCompileResult, "opportunity360" | "deal360">,
  dealId: string | null,
): Record<string, unknown> | null {
  const oppPost = result.opportunity360?.slices.execution?.payload
    ?.postDisbursementConfirmation as Record<string, unknown> | undefined;
  const deals = (oppPost?.deals as Array<Record<string, unknown>> | undefined) ?? [];
  if (dealId) {
    const match = deals.find((d) => String(d.dealId || d.id || "") === dealId);
    if (match) return match;
  }
  if (deals[0]) return deals[0]!;
  const dealSlice = asRecord(
    result.deal360?.slices.execution?.payload?.postDisbursementConfirmation,
  );
  return dealSlice;
}

function extractCommercial(
  transactionAttention: Record<string, unknown> | null,
  deal360: ChanakyaEnterpriseReadCompileResult["deal360"],
): Record<string, unknown> | null {
  const fromAttention = asRecord(transactionAttention?.commercialAttention);
  if (fromAttention) return fromAttention;
  const dealCommercial = deal360?.slices.commercial?.payload;
  return asRecord(dealCommercial);
}

function extractOpenTasks(
  result: Pick<ChanakyaEnterpriseReadCompileResult, "opportunity360">,
): Array<Record<string, unknown>> | null {
  const tasks = result.opportunity360?.slices.executive?.payload?.tasks;
  return Array.isArray(tasks) ? (tasks as Array<Record<string, unknown>>) : null;
}

export function composeTransactionExecutiveSnapshotFromCompile(
  result: Pick<
    ChanakyaEnterpriseReadCompileResult,
    | "compiledAt"
    | "opportunity360"
    | "deal360"
    | "transactionAttention"
    | "changeIntelligence"
    | "productLenderIntelligence"
    | "creditIntelligence"
  >,
): ReturnType<typeof composeTransactionExecutiveSnapshot> | null {
  if (!result.opportunity360 && !result.deal360) {
    return null;
  }

  const entityAttention = asRecord(result.transactionAttention?.entityAttention);
  const opportunity = extractOpportunity(result);
  const deal = extractPrimaryDeal(result);
  const deals = extractDeals(result);
  const dealId = result.deal360?.dealId ?? (deal ? String(deal.id || "") : null);
  const scopeLabel =
    result.deal360?.dealNumber ??
    result.opportunity360?.opportunityNumber ??
    null;

  const documentSlice = result.opportunity360?.slices.documents?.payload;
  const activityRegistry = asRecord(
    result.opportunity360?.slices.execution?.payload?.activityRegistry,
  );
  const activityLatestAt = str(activityRegistry?.latestOccurredAt) ?? null;

  const input: TransactionExecutiveSnapshotComposeInput = {
    compiledAt: result.compiledAt,
    entityKind: result.deal360 ? "deal" : "opportunity",
    scopeLabel,
    opportunity,
    deal,
    deals,
    entityAttention,
    radarRow: extractRadarRow(entityAttention),
    changeIntelligence: result.changeIntelligence ?? null,
    productLenderIntelligence: result.productLenderIntelligence ?? null,
    creditIntelligence: result.creditIntelligence ?? null,
    documentReadiness: asRecord(documentSlice?.readinessEvidence) ?? null,
    documentIntelligence: asRecord(documentSlice?.documentIntelligence) ?? null,
    openTasks: extractOpenTasks(result),
    postDisbursement: extractPostDisbursement(result, dealId),
    commercial: extractCommercial(
      result.transactionAttention as Record<string, unknown> | null,
      result.deal360,
    ),
    activityLatestAt,
  };

  return redactCustomerContactPiiForAiContext(
    composeTransactionExecutiveSnapshot(input),
  ) as ReturnType<typeof composeTransactionExecutiveSnapshot>;
}

function str(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s || null;
}

export {
  composeTransactionExecutiveSnapshot,
  assertNoPiiInExecutiveText,
} from "./transaction-executive-snapshot-core";
