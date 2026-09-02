/**
 * CO-C1-CHANAKYA-REALTIME-INTELLIGENCE-001
 * Collect authorised attention rows and project user-friendly intervention cards.
 * Consumes CHANAKYA enterprise-read compile output — no parallel business store.
 */

import { buildDealWorkspaceHref } from "@/lib/loan-journey/adr-018-routing";
import { ROUTES } from "@/constants/routes";
import type { ChanakyaInterventionCard } from "@/types/chanakya-conversation-intelligence";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function str(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s || null;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

const LIST_KEYS = [
  "priorityList",
  "needingAttention",
  "inactiveOver5Days",
  "awaitingDocuments",
  "awaitingLenderAction",
  "recentlyDisbursed",
  "attentionRows",
  "rows",
  "topAttention",
  "priorityRows",
  "items",
] as const;

function rowKey(row: Record<string, unknown>): string {
  return (
    str(row.dealId) ||
    str(row.entityId) ||
    str(row.dealNumber) ||
    str(row.opportunityId) ||
    str(row.opportunityNumber) ||
    JSON.stringify([row.customerName, row.lender, row.stageLabel])
  );
}

export function collectAuthorisedAttentionRows(
  transactionAttention: Record<string, unknown> | null | undefined,
): Record<string, unknown>[] {
  if (!transactionAttention) return [];
  const lists = asRecord(transactionAttention.lists) ?? transactionAttention;
  const seen = new Set<string>();
  const out: Record<string, unknown>[] = [];

  const push = (raw: unknown) => {
    const row = asRecord(raw);
    if (!row) return;
    const key = rowKey(row);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(row);
  };

  for (const key of LIST_KEYS) {
    for (const item of asArray(lists[key])) push(item);
    for (const item of asArray(transactionAttention[key])) push(item);
  }

  const registry = asRecord(transactionAttention.portfolioBusinessRegistry);
  if (registry) {
    for (const item of asArray(registry.allDeals)) push(item);
    for (const item of asArray(registry.activeDeals)) push(item);
    for (const item of asArray(registry.inactiveDeals)) push(item);
  }

  return out;
}

export function looksLikeBusinessLoanProduct(row: Record<string, unknown>): boolean {
  const blob = [
    row.product,
    row.loanProduct,
    row.productLabel,
    row.title,
    row.entityLabel,
  ]
    .map((v) => String(v ?? "").toLowerCase())
    .join(" ");
  return (
    blob.includes("business loan") ||
    blob.includes("working capital") ||
    blob.includes("unsecured business") ||
    /\bbl\b/.test(blob)
  );
}

function nextActionFromRow(row: Record<string, unknown>): string {
  const recommended = str(row.recommendedNextArea);
  const pendingDocs = num(row.pendingDocs) ?? 0;
  const openTasks = num(row.openTasks) ?? 0;
  const sla = `${str(row.slaLabel) || ""} ${str(row.quadrant) || ""}`.toLowerCase();
  if (pendingDocs > 0) {
    return `Collect the ${pendingDocs} pending document${pendingDocs === 1 ? "" : "s"} and confirm login completeness.`;
  }
  if (openTasks > 0) {
    return `Close the ${openTasks} open task${openTasks === 1 ? "" : "s"} on this case before the next lender follow-up.`;
  }
  if (sla.includes("sla") || sla.includes("overdue") || sla.includes("at_risk")) {
    return "Call the assigned RC employee with the SLA gap and agree a same-day recovery action.";
  }
  if (recommended === "documents") return "Clear the outstanding document gap on this case.";
  if (recommended === "tasks") return "Complete the overdue task on this case.";
  if (recommended === "lender_stage") return "Follow up with the lender on the current stage.";
  return "Review the latest activity with the assigned RC employee and confirm the next operational step.";
}

function reasonFromRow(row: Record<string, unknown>): string {
  const why = Array.isArray(row.why)
    ? row.why.map((item) => String(item).trim()).filter(Boolean)
    : [];
  if (why.length > 0) return why.slice(0, 3).join(" ");
  return (
    str(row.classificationReason) ||
    str(row.attentionReason) ||
    str(row.summary) ||
    "Live attention evidence shows this case needs review."
  );
}

function freshnessLabel(compiledAt: string | null, liveTrusted: boolean): string {
  if (!compiledAt) return liveTrusted ? "live operational view" : "live view unavailable";
  try {
    const d = new Date(compiledAt);
    if (Number.isNaN(d.getTime())) return liveTrusted ? "live operational view" : "live view unavailable";
    const when = d.toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" });
    return liveTrusted ? `live as of ${when}` : `last compile ${when} — live trust not confirmed`;
  } catch {
    return liveTrusted ? "live operational view" : "live view unavailable";
  }
}

export function projectInterventionCard(
  row: Record<string, unknown>,
  compiledAt: string | null,
  liveTrusted: boolean,
): ChanakyaInterventionCard {
  const opportunityRef = str(row.opportunityNumber) || str(row.opportunityRef);
  const dealRef = str(row.dealNumber) || str(row.dealRef);
  const opportunityId = str(row.opportunityId) || opportunityRef;
  const dealId = str(row.dealId) || str(row.entityId) || dealRef;
  const href =
    dealId || dealRef
      ? buildDealWorkspaceHref({
          dealId,
          opportunityId,
        })
      : opportunityId
        ? `${ROUTES.OPPORTUNITY_WORKSPACE}/${encodeURIComponent(opportunityId)}`
        : ROUTES.MY_DEALS;

  const sla =
    str(row.slaOrExpectedDate) ||
    str(row.expectedDate) ||
    str(row.slaDueOn) ||
    (String(row.quadrant || "").includes("at_risk") ? "SLA / ageing risk indicated" : null);

  return {
    customerName: str(row.customerName) || str(row.entityLabel) || str(row.borrowerName),
    companyName: str(row.companyName),
    product: str(row.productLabel) || str(row.product) || str(row.loanProduct),
    lender: str(row.lender) || str(row.lenderName),
    opportunityRef,
    dealRef,
    opportunityId,
    dealId,
    stage: str(row.stageLabel) || str(row.stage) || str(row.dealStage),
    daysInStage: num(row.daysInStage) ?? num(row.idleDays),
    assignedRcEmployee:
      str(row.assignedRcEmployee) ||
      str(row.relationshipManagerName) ||
      str(row.ownerLabel) ||
      str(row.assignedRm),
    slaOrExpectedDate: sla,
    pendingDocuments: num(row.pendingDocs),
    pendingTasks: num(row.openTasks),
    latestActivity: str(row.latestActivityLabel) || str(row.lastActivityLabel) || str(row.lastActivity),
    reason: reasonFromRow(row),
    recommendedNextAction: nextActionFromRow(row),
    lastUpdated: str(row.attentionSince) || str(row.updatedAt) || compiledAt,
    freshness: freshnessLabel(compiledAt, liveTrusted),
    href,
  };
}

export function buildInterventionCards(input: {
  transactionAttention: Record<string, unknown> | null | undefined;
  compiledAt?: string | null;
  liveTrusted?: boolean;
  productFilter?: "business_loan" | "all";
  limit?: number;
}): ChanakyaInterventionCard[] {
  const compiledAt = input.compiledAt ?? null;
  const liveTrusted = Boolean(input.liveTrusted);
  const limit = Math.min(Math.max(input.limit ?? 8, 1), 20);
  let rows = collectAuthorisedAttentionRows(input.transactionAttention);
  if (input.productFilter === "business_loan") {
    const bl = rows.filter(looksLikeBusinessLoanProduct);
    if (bl.length > 0) rows = bl;
  }
  return rows.slice(0, limit).map((row) => projectInterventionCard(row, compiledAt, liveTrusted));
}

export function similarInterventionCards(
  cards: ChanakyaInterventionCard[],
  focus: ChanakyaInterventionCard | null,
  limit = 4,
): ChanakyaInterventionCard[] {
  if (!focus) return [];
  const product = (focus.product || "").toLowerCase();
  const stage = (focus.stage || "").toLowerCase();
  return cards
    .filter((card) => {
      const sameId =
        (focus.dealId && card.dealId === focus.dealId) ||
        (focus.dealRef && card.dealRef === focus.dealRef);
      if (sameId) return false;
      const productMatch = product && (card.product || "").toLowerCase() === product;
      const stageMatch = stage && (card.stage || "").toLowerCase() === stage;
      return productMatch || stageMatch;
    })
    .slice(0, limit);
}

export const INTERVENTION_EMPTY_CRITERIA = [
  "authorised live Deals in the actor's visibility scope",
  "attention, SLA/ageing, pending documents, or open tasks",
  "business-loan product labels when the question asked for business loans",
] as const;
