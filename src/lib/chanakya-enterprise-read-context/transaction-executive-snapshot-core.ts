/**
 * CO-CHANAKYA-026 — Transaction executive snapshot core (verify-friendly).
 * Synthesises evidence-backed executive answers from existing SSOT projections.
 * No new risk score — reuses Radar / EBI classifications only.
 */

import type { ChanakyaCreditIntelligenceContext } from "@/types/chanakya-credit-intelligence";
import {
  CHANAKYA_FIELD_AVAILABILITY,
  type ChanakyaAttentionEvidenceRow,
  type ChanakyaChangeIntelligenceContext,
  type ChanakyaExecutiveEvidenceTrace,
  type ChanakyaFieldAvailability,
  type ChanakyaProductLenderIntelligenceContext,
  type ChanakyaTransactionExecutiveSnapshot,
} from "@/types/chanakya-enterprise-read-context";
import { fieldAvailable, fieldMissing } from "./field";

const PII_PATTERN =
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b|\b(?:\+91|91)?[6-9]\d{9}\b/i;

export function assertNoPiiInExecutiveText(text: string): boolean {
  return !PII_PATTERN.test(text);
}

export type TransactionExecutiveSnapshotComposeInput = {
  compiledAt?: string;
  entityKind: "opportunity" | "deal";
  scopeLabel?: string | null;
  opportunity?: Record<string, unknown> | null;
  deal?: Record<string, unknown> | null;
  deals?: Array<Record<string, unknown>> | null;
  entityAttention?: Record<string, unknown> | null;
  radarRow?: ChanakyaAttentionEvidenceRow | null;
  changeIntelligence?: ChanakyaChangeIntelligenceContext | null;
  productLenderIntelligence?: ChanakyaProductLenderIntelligenceContext | null;
  creditIntelligence?: ChanakyaCreditIntelligenceContext | null;
  documentReadiness?: Record<string, unknown> | null;
  documentIntelligence?: Record<string, unknown> | null;
  openTasks?: Array<Record<string, unknown>> | null;
  postDisbursement?: Record<string, unknown> | null;
  commercial?: Record<string, unknown> | null;
  activityLatestAt?: string | null;
};

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

function pickPrimaryDeal(
  deal: Record<string, unknown> | null | undefined,
  deals: Array<Record<string, unknown>> | null | undefined,
): Record<string, unknown> | null {
  if (deal) return deal;
  if (deals?.length) return deals[0] ?? null;
  return null;
}

function lenderLabels(
  deal: Record<string, unknown> | null,
  deals: Array<Record<string, unknown>> | null | undefined,
  pli: ChanakyaProductLenderIntelligenceContext | null | undefined,
): string[] {
  const names = new Set<string>();
  for (const d of deals ?? []) {
    const n = str(d.lenderName);
    if (n) names.add(n);
  }
  if (deal) {
    const n = str(deal.lenderName);
    if (n) names.add(n);
  }
  for (const a of pli?.assignedLenders ?? []) {
    if (a.lenderName) names.add(a.lenderName);
  }
  return [...names];
}

function resolveStage(
  deal: Record<string, unknown> | null,
  opp: Record<string, unknown> | null,
  radarRow: ChanakyaAttentionEvidenceRow | null | undefined,
): string | null {
  if (deal) {
    const parts = [str(deal.grossStage), str(deal.subStage)].filter(Boolean);
    if (parts.length) return parts.join(" / ");
  }
  if (radarRow?.stageLabel) return radarRow.stageLabel;
  return str(opp?.lifecycleStatus) ?? str(opp?.requirementStage);
}

function buildDocumentsSection(input: TransactionExecutiveSnapshotComposeInput) {
  const readiness = input.documentReadiness?.documentReadiness as
    | Record<string, unknown>
    | undefined;
  const pending = num(readiness?.pending);
  const critical = num(readiness?.criticalPending);
  const readable = num(input.documentIntelligence?.documentsWithReadableText);
  const hasEvidence =
    pending != null ||
    critical != null ||
    readable != null ||
    input.documentReadiness?.status === CHANAKYA_FIELD_AVAILABILITY.AVAILABLE;

  let summary = "Document evidence NOT AVAILABLE for this transaction.";
  if (hasEvidence) {
    const parts: string[] = [];
    if (pending != null) parts.push(`${pending} requirement(s) pending`);
    if (critical != null && critical > 0) parts.push(`${critical} critical`);
    if (readable != null) parts.push(`${readable} readable on file`);
    summary = parts.length ? parts.join("; ") + "." : "Document checklist loaded.";
  }

  return {
    summary,
    pendingCount: pending,
    criticalPendingCount: critical,
    readableDocuments: readable,
    availability: hasEvidence
      ? CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
      : CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
    provenance: "document_requests/readiness + chanakya_document_intelligence",
  };
}

function buildTasksSection(tasks: Array<Record<string, unknown>> | null | undefined) {
  const open = (tasks ?? []).filter(
    (t) => !/completed|closed|cancelled/i.test(str(t.status) ?? ""),
  );
  const overdue = open.filter((t) => /overdue/i.test(str(t.status) ?? ""));
  const availability =
    tasks && tasks.length > 0
      ? CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
      : CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE;
  return {
    summary:
      open.length > 0
        ? `${open.length} open task(s)${overdue.length ? ` (${overdue.length} overdue signal)` : ""}.`
        : "No open Enterprise Task Engine tasks surfaced for this scope.",
    openCount: open.length || null,
    overdueCount: overdue.length || null,
    availability,
    provenance: "enterprise_task_engine",
  };
}

function buildAttentionSection(
  entityAttention: Record<string, unknown> | null | undefined,
  radarRow: ChanakyaAttentionEvidenceRow | null | undefined,
) {
  const why = Array.isArray(entityAttention?.why)
    ? (entityAttention!.why as string[]).filter(Boolean)
    : radarRow?.why?.length
      ? radarRow.why
      : [];
  const classification =
    radarRow?.classification ??
    radarRow?.quadrant ??
    str(entityAttention?.attention) ??
    null;
  const severity = radarRow?.severity ?? null;
  const quadrant = radarRow?.quadrant ?? null;
  const recommendedNextArea =
    str(entityAttention?.recommendedNextArea) ?? radarRow?.recommendedNextArea ?? null;

  const availability =
    why.length > 0 || classification
      ? CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
      : CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE;

  const summary =
    availability === CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
      ? [
          classification ? `Classification: ${classification}.` : null,
          severity ? `Radar severity: ${severity}.` : null,
          why[0] ?? null,
        ]
          .filter(Boolean)
          .join(" ")
      : "No Radar / joined-engine attention evidence for this transaction scope.";

  return {
    classification,
    severity,
    quadrant,
    why,
    recommendedNextArea,
    summary,
    availability,
    provenance: "chanakya_radar + loadEbiDataContext + attention-intelligence joins",
  };
}

function buildChangesSection(change: ChanakyaChangeIntelligenceContext | null | undefined) {
  if (!change) {
    return {
      summary: "Change intelligence NOT AVAILABLE.",
      materialChangeCount: 0,
      recentHeadlines: [] as string[],
      periodLabel: null,
      availability: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      provenance: "chanakya_change_intelligence",
    };
  }
  const meaningful = change.changes.filter((c) => c.significance === "meaningful");
  const recentHeadlines = meaningful.slice(0, 5).map((c) => c.title);
  return {
    summary: change.summary,
    materialChangeCount: meaningful.length,
    recentHeadlines,
    periodLabel: change.period?.label ?? null,
    availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    provenance: change.provenance.join(" + "),
  };
}

function buildFinancialSection(ci: ChanakyaCreditIntelligenceContext | null | undefined) {
  if (!ci || ci.availability === "NOT_AVAILABLE") {
    return {
      summary: "Financial intelligence NOT AVAILABLE.",
      yearsAvailable: 0,
      availability: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      provenance: "chanakya_credit_intelligence",
    };
  }
  const years = ci.financialProfile.years.length;
  const assessment = ci.creditAssessment.overallAssessment.summary?.trim();
  return {
    summary:
      assessment ||
      (years > 0
        ? `Financial profile spans ${years} year(s); see credit intelligence for detail.`
        : "Credit intelligence loaded without durable financial year facts."),
    yearsAvailable: years,
    availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    provenance: "chanakya_credit_intelligence.financialProfile",
  };
}

function buildGstSection(ci: ChanakyaCreditIntelligenceContext | null | undefined) {
  if (!ci || ci.gstAnalysis.availability === "NOT_AVAILABLE") {
    return {
      summary: "GST intelligence NOT AVAILABLE.",
      returnCount: 0,
      availability: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      provenance: "chanakya_credit_intelligence.gstAnalysis",
    };
  }
  const count = ci.gstAnalysis.returns.length;
  return {
    summary:
      count > 0
        ? `${count} GST return period(s) with persisted extraction evidence.`
        : "GST analysis loaded without return periods.",
    returnCount: count,
    availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    provenance: "chanakya_credit_intelligence.gstAnalysis",
  };
}

function buildBankingSection(ci: ChanakyaCreditIntelligenceContext | null | undefined) {
  if (!ci || ci.bankingAnalysis.availability === "NOT_AVAILABLE") {
    return {
      summary: "Banking intelligence NOT AVAILABLE.",
      statementCount: 0,
      availability: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      provenance: "chanakya_credit_intelligence.bankingAnalysis",
    };
  }
  const count = ci.bankingAnalysis.documentInventory.length;
  const trend =
    ci.bankingAnalysis.bankingTrend?.observations?.[0]?.trim() ||
    ci.bankingAnalysis.limitation?.trim() ||
    null;
  return {
    summary:
      trend ||
      (count > 0
        ? `${count} bank statement(s) in document inventory.`
        : "Banking analysis loaded without statement inventory."),
    statementCount: count,
    availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    provenance: "chanakya_credit_intelligence.bankingAnalysis",
  };
}

function buildProductLenderSection(
  pli: ChanakyaProductLenderIntelligenceContext | null | undefined,
) {
  if (!pli || pli.availability === CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE) {
    return {
      summary: "Product / Lender intelligence NOT AVAILABLE.",
      matrixDepthStatus: null,
      assignedLenderCount: null,
      availability: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      provenance: "chanakya_product_lender_intelligence",
    };
  }
  return {
    summary: pli.summary,
    matrixDepthStatus: pli.matrixDepth?.status ?? null,
    assignedLenderCount: pli.transactionSnapshot?.assignedLenderCount ?? null,
    availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    provenance: pli.provenance.join(" + "),
  };
}

function buildCommercialSection(commercial: Record<string, unknown> | null | undefined) {
  if (!commercial || commercial.status === CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE) {
    return {
      summary: "Commercial / accounting evidence NOT AVAILABLE.",
      outstandingInvoiceCount: null,
      paymentReceivedCount: null,
      availability: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      provenance: "enterprise_accounting_invoice + enterprise_accounting_payment",
    };
  }
  const invoices = commercial.outstandingInvoices as unknown[] | undefined;
  const payments = commercial.recentPayments as unknown[] | undefined;
  const outstandingCount = Array.isArray(invoices) ? invoices.length : null;
  const paymentCount = Array.isArray(payments) ? payments.length : null;
  const parts: string[] = [];
  if (outstandingCount != null && outstandingCount > 0) {
    parts.push(`${outstandingCount} outstanding invoice signal(s)`);
  }
  if (paymentCount != null && paymentCount > 0) {
    parts.push(`${paymentCount} recent payment(s) on record`);
  }
  return {
    summary: parts.length
      ? parts.join("; ") + "."
      : str(commercial.summary) ?? "Commercial accounting context loaded.",
    outstandingInvoiceCount: outstandingCount,
    paymentReceivedCount: paymentCount,
    availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    provenance: "enterprise_accounting_case + commercial-projections",
  };
}

function buildPostDisbursementSection(
  postDisbursement: Record<string, unknown> | null | undefined,
) {
  const state = str(postDisbursement?.confirmationState);
  if (!postDisbursement || postDisbursement.status === CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE) {
    return {
      summary: "Post-disbursement confirmation NOT AVAILABLE.",
      confirmationState: null,
      availability: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      provenance: "post_disbursement_confirmation",
    };
  }
  return {
    summary: state
      ? `Post-disbursement confirmation state: ${state.replace(/_/g, " ")}.`
      : "Post-disbursement evidence loaded.",
    confirmationState: state,
    availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    provenance: "post_disbursement_confirmation + enterprise_activity_registry",
  };
}

function collectMissingInformation(input: {
  pli: ChanakyaProductLenderIntelligenceContext | null | undefined;
  ci: ChanakyaCreditIntelligenceContext | null | undefined;
  documents: ReturnType<typeof buildDocumentsSection>;
  attention: ReturnType<typeof buildAttentionSection>;
}): string[] {
  const gaps = new Set<string>();
  for (const m of input.pli?.missingInformation ?? []) {
    if (m.statement) gaps.add(m.statement);
  }
  for (const c of input.ci?.keyConcerns ?? []) {
    if (c.statement) gaps.add(c.statement);
  }
  if (
    input.documents.pendingCount != null &&
    input.documents.pendingCount > 0 &&
    input.documents.criticalPendingCount != null &&
    input.documents.criticalPendingCount > 0
  ) {
    gaps.add(
      `${input.documents.criticalPendingCount} critical document requirement(s) still pending.`,
    );
  }
  if (input.attention.why.some((w) => /pending|missing|delay|idle/i.test(w))) {
    gaps.add(input.attention.why.find((w) => /pending|missing|delay|idle/i.test(w))!);
  }
  return [...gaps].slice(0, 12);
}

function buildRecommendedAction(input: {
  attention: ReturnType<typeof buildAttentionSection>;
  documents: ReturnType<typeof buildDocumentsSection>;
  tasks: ReturnType<typeof buildTasksSection>;
  postDisbursement: ReturnType<typeof buildPostDisbursementSection>;
  commercial: ReturnType<typeof buildCommercialSection>;
  changes: ReturnType<typeof buildChangesSection>;
}): ChanakyaTransactionExecutiveSnapshot["recommendedNextHumanAction"] {
  const traceableTo: string[] = [];
  let statement: string | null = null;

  if (input.attention.recommendedNextArea) {
    statement = `Review ${input.attention.recommendedNextArea.replace(/_/g, " ")} based on joined Radar / operational evidence.`;
    traceableTo.push("attention.recommendedNextArea");
    if (input.attention.why[0]) traceableTo.push(`attention.why: ${input.attention.why[0]}`);
  } else if (
    input.documents.criticalPendingCount != null &&
    input.documents.criticalPendingCount > 0
  ) {
    statement = `Prioritise ${input.documents.criticalPendingCount} critical pending document(s) before advancing lender workflow.`;
    traceableTo.push("documents.criticalPendingCount");
  } else if (input.postDisbursement.confirmationState === "confirmation_pending") {
    statement = "Complete post-disbursement confirmation while disbursement evidence is pending.";
    traceableTo.push("postDisbursement.confirmationState");
  } else if (
    input.commercial.outstandingInvoiceCount != null &&
    input.commercial.outstandingInvoiceCount > 0
  ) {
    statement = "Review outstanding commercial invoices and follow up on accounting actions.";
    traceableTo.push("commercialAccounting.outstandingInvoiceCount");
  } else if (input.tasks.overdueCount != null && input.tasks.overdueCount > 0) {
    statement = "Clear overdue Enterprise Task Engine items tied to this transaction.";
    traceableTo.push("tasks.overdueCount");
  } else if (input.changes.materialChangeCount > 0 && input.changes.recentHeadlines[0]) {
    statement = `Review recent material change: ${input.changes.recentHeadlines[0]}`;
    traceableTo.push("changes.recentHeadlines");
  } else if (input.attention.why[0]) {
    statement = input.attention.why[0]!;
    traceableTo.push("attention.why");
  }

  if (!statement) {
    return {
      statement:
        "No urgent executive action inferred — continue monitoring via Radar and Activity Registry.",
      traceableTo: ["chanakya_radar_attention_evidence"],
      availability: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      provenance: "chanakya_transaction_executive_synthesis",
    };
  }

  return {
    statement,
    traceableTo,
    availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    provenance: "chanakya_transaction_executive_synthesis",
  };
}

function buildExecutiveSynthesis(input: {
  scopeLabel: string | null;
  product: string | null;
  stage: string | null;
  lenders: string[];
  attention: ReturnType<typeof buildAttentionSection>;
  documents: ReturnType<typeof buildDocumentsSection>;
  tasks: ReturnType<typeof buildTasksSection>;
  changes: ReturnType<typeof buildChangesSection>;
  financial: ReturnType<typeof buildFinancialSection>;
  banking: ReturnType<typeof buildBankingSection>;
  commercial: ReturnType<typeof buildCommercialSection>;
  recommended: ChanakyaTransactionExecutiveSnapshot["recommendedNextHumanAction"];
}): string {
  const parts: string[] = [];

  const headline = [
    input.scopeLabel ? `Transaction ${input.scopeLabel}` : null,
    input.product ? `(${input.product})` : null,
    input.stage ? `is at ${input.stage}` : null,
    input.lenders.length ? `with ${input.lenders.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  if (headline) parts.push(`${headline}.`);

  if (input.attention.availability === CHANAKYA_FIELD_AVAILABILITY.AVAILABLE) {
    parts.push(input.attention.summary);
  }

  const ops: string[] = [];
  if (input.documents.availability === CHANAKYA_FIELD_AVAILABILITY.AVAILABLE) {
    ops.push(`Documents: ${input.documents.summary}`);
  }
  if (input.tasks.availability === CHANAKYA_FIELD_AVAILABILITY.AVAILABLE) {
    ops.push(`Tasks: ${input.tasks.summary}`);
  }
  if (ops.length) parts.push(ops.join(" "));

  if (input.changes.availability === CHANAKYA_FIELD_AVAILABILITY.AVAILABLE) {
    parts.push(`Changes (${input.changes.periodLabel ?? "period"}): ${input.changes.summary}`);
  }

  const intel: string[] = [];
  if (input.financial.availability === CHANAKYA_FIELD_AVAILABILITY.AVAILABLE) {
    intel.push(`Financial: ${input.financial.summary}`);
  }
  if (input.banking.availability === CHANAKYA_FIELD_AVAILABILITY.AVAILABLE) {
    intel.push(`Banking: ${input.banking.summary}`);
  }
  if (input.commercial.availability === CHANAKYA_FIELD_AVAILABILITY.AVAILABLE) {
    intel.push(`Commercial: ${input.commercial.summary}`);
  }
  if (intel.length) parts.push(intel.join(" "));

  parts.push(`Recommended next action: ${input.recommended.statement}`);

  return parts.join("\n\n");
}

function buildEvidenceTrace(input: {
  attention: ReturnType<typeof buildAttentionSection>;
  documents: ReturnType<typeof buildDocumentsSection>;
  changes: ReturnType<typeof buildChangesSection>;
  recommended: ChanakyaTransactionExecutiveSnapshot["recommendedNextHumanAction"];
}): ChanakyaExecutiveEvidenceTrace[] {
  const trace: ChanakyaExecutiveEvidenceTrace[] = [];
  for (const w of input.attention.why.slice(0, 4)) {
    trace.push({
      section: "attention",
      source: "chanakya_radar_attention_evidence",
      statement: w,
    });
  }
  if (input.documents.pendingCount != null) {
    trace.push({
      section: "documents",
      source: "document_requests/readiness",
      statement: input.documents.summary,
    });
  }
  for (const h of input.changes.recentHeadlines.slice(0, 3)) {
    trace.push({ section: "changes", source: "enterprise_activity_registry", statement: h });
  }
  trace.push({
    section: "recommendedNextHumanAction",
    source: input.recommended.provenance,
    statement: input.recommended.statement,
  });
  return trace;
}

export function composeTransactionExecutiveSnapshot(
  input: TransactionExecutiveSnapshotComposeInput,
): ChanakyaTransactionExecutiveSnapshot {
  const compiledAt = input.compiledAt ?? new Date().toISOString();
  const opp = input.opportunity ?? null;
  const primaryDeal = pickPrimaryDeal(input.deal ?? null, input.deals ?? null);
  const lenders = lenderLabels(primaryDeal, input.deals ?? null, input.productLenderIntelligence);
  const stage = resolveStage(primaryDeal, opp, input.radarRow);
  const scopeLabel =
    input.scopeLabel ??
    str(primaryDeal?.dealNumber) ??
    str(opp?.opportunityNumber) ??
    str(opp?.id) ??
    null;

  const documents = buildDocumentsSection(input);
  const tasks = buildTasksSection(input.openTasks);
  const attention = buildAttentionSection(input.entityAttention, input.radarRow);
  const changes = buildChangesSection(input.changeIntelligence);
  const financial = buildFinancialSection(input.creditIntelligence);
  const gst = buildGstSection(input.creditIntelligence);
  const banking = buildBankingSection(input.creditIntelligence);
  const productLender = buildProductLenderSection(input.productLenderIntelligence);
  const commercial = buildCommercialSection(input.commercial);
  const postDisbursement = buildPostDisbursementSection(input.postDisbursement);
  const missingInformation = collectMissingInformation({
    pli: input.productLenderIntelligence,
    ci: input.creditIntelligence,
    documents,
    attention,
  });
  const recommendedNextHumanAction = buildRecommendedAction({
    attention,
    documents,
    tasks,
    postDisbursement,
    commercial,
    changes,
  });

  const executiveSynthesis = buildExecutiveSynthesis({
    scopeLabel,
    product: str(opp?.productLabel) ?? input.productLenderIntelligence?.productContext.productName ?? null,
    stage,
    lenders,
    attention,
    documents,
    tasks,
    changes,
    financial,
    banking,
    commercial,
    recommended: recommendedNextHumanAction,
  });

  const evidenceTrace = buildEvidenceTrace({
    attention,
    documents,
    changes,
    recommended: recommendedNextHumanAction,
  });

  const borrowerName = str(opp?.primaryContactName);
  const companyName = str(opp?.companyName);
  const borrowerSummary = [borrowerName, companyName].filter(Boolean).join(" · ") || "Not Specified";

  const idleDays =
    input.radarRow?.idleDays ??
    (primaryDeal?.stageEnteredAt
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(String(primaryDeal.stageEnteredAt)).getTime()) / 86_400_000,
          ),
        )
      : null);

  const lastActivity =
    str(input.activityLatestAt) ??
    str(input.changeIntelligence?.changes?.[0]?.changedAt) ??
    input.radarRow?.attentionSince ??
    null;

  const availability: ChanakyaFieldAvailability =
    scopeLabel ||
    opp ||
    primaryDeal ||
    attention.availability === CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
      ? CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
      : CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE;

  return {
    availability,
    readOnly: true,
    entityKind: input.entityKind,
    scopeLabel,
    compiledAt,
    identity: {
      opportunityId: opp?.id
        ? fieldAvailable(String(opp.id), "transactions", "enterprise_opportunity_registry")
        : fieldMissing("transactions", "enterprise_opportunity_registry"),
      opportunityNumber: opp?.opportunityNumber
        ? fieldAvailable(str(opp.opportunityNumber), "transactions", "enterprise_opportunity_registry")
        : fieldMissing("transactions", "enterprise_opportunity_registry"),
      dealId: primaryDeal?.id
        ? fieldAvailable(String(primaryDeal.id), "execution", "enterprise_deal_registry")
        : fieldMissing("execution", "enterprise_deal_registry"),
      dealNumber: primaryDeal?.dealNumber
        ? fieldAvailable(str(primaryDeal.dealNumber), "execution", "enterprise_deal_registry")
        : fieldMissing("execution", "enterprise_deal_registry"),
      ownerLabel:
        input.radarRow?.ownerLabel != null
          ? fieldAvailable(input.radarRow.ownerLabel, "executive", "chanakya_radar")
          : opp?.relationshipManagerName
            ? fieldAvailable(str(opp.relationshipManagerName), "transactions", "enterprise_opportunity_registry")
            : fieldMissing("executive", "chanakya_radar"),
    },
    borrowerProfile: {
      primaryContactName: borrowerName
        ? fieldAvailable(borrowerName, "relationships", "enterprise_opportunity_registry")
        : fieldMissing("relationships", "enterprise_opportunity_registry"),
      companyName: companyName
        ? fieldAvailable(companyName, "relationships", "enterprise_opportunity_registry")
        : fieldMissing("relationships", "enterprise_opportunity_registry"),
      employmentTypeCode: str(opp?.employmentTypeCode)
        ? fieldAvailable(str(opp!.employmentTypeCode), "relationships", "enterprise_opportunity_registry")
        : fieldMissing("relationships", "enterprise_opportunity_registry"),
      cityLabel: str(opp?.cityLabel)
        ? fieldAvailable(str(opp!.cityLabel), "relationships", "enterprise_opportunity_registry")
        : fieldMissing("relationships", "enterprise_opportunity_registry"),
      summary: borrowerSummary,
      availability:
        borrowerName || companyName
          ? CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
          : CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      provenance: "enterprise_opportunity_registry (contact channels redacted)",
    },
    product: str(opp?.productLabel)
      ? fieldAvailable(str(opp!.productLabel), "transactions", "enterprise_opportunity_registry")
      : fieldMissing("transactions", "enterprise_opportunity_registry"),
    requestedAmount:
      num(opp?.requestedAmount) != null
        ? fieldAvailable(num(opp!.requestedAmount)!, "transactions", "enterprise_opportunity_registry")
        : fieldMissing("transactions", "enterprise_opportunity_registry"),
    currentStage: stage
      ? fieldAvailable(stage, "execution", "enterprise_deal_registry + chanakya_radar")
      : fieldMissing("execution", "enterprise_deal_registry"),
    lenders:
      lenders.length > 0
        ? fieldAvailable(lenders, "execution", "enterprise_deal_registry + product_lender_intelligence")
        : fieldMissing("execution", "enterprise_deal_registry"),
    stageAge:
      idleDays != null
        ? fieldAvailable(
            {
              idleDays,
              label:
                idleDays >= 5
                  ? `${idleDays} day(s) since last meaningful movement signal`
                  : `${idleDays} day(s) stage age signal`,
            },
            "executive",
            "chanakya_radar.idleDays",
          )
        : fieldMissing("executive", "chanakya_radar"),
    lastMeaningfulActivity: lastActivity
      ? fieldAvailable(lastActivity, "executive", "enterprise_activity_registry + chanakya_radar")
      : fieldMissing("executive", "enterprise_activity_registry"),
    documents,
    tasks,
    attention,
    changes,
    financialIntelligence: financial,
    gst,
    banking,
    productLender,
    commercialAccounting: commercial,
    postDisbursement,
    missingInformation,
    recommendedNextHumanAction,
    executiveSynthesis,
    evidenceTrace,
    limitations: [
      "Transaction executive snapshot is read-only evidence synthesis — not underwriting, approval, or a new risk engine.",
      "Attention uses existing Radar / EBI classifications only; no new risk score is computed.",
      "Customer mobile and email never appear in this snapshot.",
      "Recommendations are traceable to SSOT evidence via evidenceTrace — not invented policy.",
    ],
    provenance: [
      "enterprise_opportunity_registry",
      "enterprise_deal_registry",
      "chanakya_radar",
      "enterprise_business_intelligence",
      "enterprise_activity_registry",
      "chanakya_change_intelligence",
      "chanakya_credit_intelligence",
      "chanakya_product_lender_intelligence",
      "enterprise_accounting_case",
      "post_disbursement_confirmation",
    ],
  };
}
