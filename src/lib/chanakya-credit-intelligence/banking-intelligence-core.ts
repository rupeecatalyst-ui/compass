/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-013 — Banking intelligence core (verify-friendly).
 * Evidence-first · no FOIR/DSCR · no fabricated balances.
 */

import type {
  ChanakyaBankDocumentAvailabilityState,
  ChanakyaDocumentContentReadResult,
  ChanakyaDocumentExtractedFact,
} from "@/types/chanakya-document-intelligence";
import type {
  ChanakyaCreditBankAccountSummary,
  ChanakyaCreditBankDocumentInventoryItem,
  ChanakyaCreditBankVsTurnoverReconciliation,
  ChanakyaCreditBankingAnalysis,
  ChanakyaCreditFactProvenance,
  ChanakyaCreditFinancialFact,
  ChanakyaCreditFinancialProfile,
  ChanakyaCreditGstAnalysis,
  ChanakyaCreditSectionAvailability,
} from "@/types/chanakya-credit-intelligence";
import {
  assessStatementPeriodCompleteness,
  buildBankingTrendFromAccounts,
  mayDeriveAverageBalanceFromOpenClose,
  resolveAggregateBankEvidenceTier,
  resolveBankEvidenceTier,
} from "./banking-evidence-core";
import {
  bankStateAllowsFactExtraction,
  isBankStatementDocument,
  resolveBankDocumentState,
} from "@/lib/chanakya-document-intelligence/resolve-bank-document-state";

function localFactProvenance(f: ChanakyaDocumentExtractedFact): ChanakyaCreditFactProvenance {
  return {
    documentId: f.provenance.documentId,
    documentName: f.provenance.displayName,
    opportunityId: f.provenance.opportunityId,
    section: f.provenance.sectionOrTable,
    financialYear: f.periodLabel ?? null,
    field: f.key,
    value: f.value,
    unit: f.unit ?? null,
    extractionMethod: f.provenance.extractionMethod,
    confidence: f.provenance.confidence,
    source: "document_intelligence",
  };
}

function parseBankNumeric(value: string, unit?: string | null): number | null {
  const raw = value.replace(/[₹,\s]/g, "").trim();
  let num = Number(raw.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(num) || num < 0) return null;
  const u = (unit ?? "").toLowerCase();
  if (/\bcrore|\bcr\b/.test(u)) num *= 1e7;
  else if (/\blakh|\blac/.test(u)) num *= 1e5;
  else if (/\bthousands?\b/.test(u)) num *= 1e3;
  return num;
}

function isReliableBankFact(f: ChanakyaDocumentExtractedFact): boolean {
  return f.provenance.confidence !== "ambiguous" && f.provenance.confidence !== "none";
}

const CORE_BANK_KEYS = new Set([
  "opening_balance",
  "closing_balance",
  "statement_period",
  "bank_name",
  "account_type",
  "transaction_count",
  "total_credits",
  "total_debits",
  "average_balance",
]);

const INDICATOR_KEYS = new Set([
  "emi_indicator",
  "cheque_return_indicator",
  "concentration_observation",
]);

export function isBankFactKey(key: string): boolean {
  return CORE_BANK_KEYS.has(key) || INDICATOR_KEYS.has(key);
}

function sectionAvailability(count: number): ChanakyaCreditSectionAvailability {
  if (count === 0) return "NOT_AVAILABLE";
  return "AVAILABLE";
}

function deriveAverageBalanceFromEvidence(input: {
  opening: string | null;
  closing: string | null;
  statedAverage: string | null;
  statementPeriodComplete: boolean;
}): { value: string | null; confidence: "high" | "medium" | "low" } {
  if (input.statedAverage) {
    return { value: input.statedAverage, confidence: "high" };
  }
  if (
    !mayDeriveAverageBalanceFromOpenClose({
      statementPeriodComplete: input.statementPeriodComplete,
      openingBalance: input.opening,
      closingBalance: input.closing,
      statedAverage: input.statedAverage,
    })
  ) {
    return { value: null, confidence: "low" };
  }
  const open = input.opening ? parseBankNumeric(input.opening, "inr") : null;
  const close = input.closing ? parseBankNumeric(input.closing, "inr") : null;
  if (open != null && close != null) {
    const avg = (open + close) / 2;
    return {
      value: avg.toLocaleString("en-IN", { maximumFractionDigits: 2 }),
      confidence: "medium",
    };
  }
  return { value: null, confidence: "low" };
}

function balanceMovementObservation(
  opening: string | null,
  closing: string | null,
): string | null {
  const open = opening ? parseBankNumeric(opening, "inr") : null;
  const close = closing ? parseBankNumeric(closing, "inr") : null;
  if (open == null || close == null) return null;
  const delta = close - open;
  if (Math.abs(delta) < 1) return "Opening and closing balances are broadly unchanged for the statement period.";
  return delta > 0
    ? "Closing balance exceeds opening balance for the statement period."
    : "Closing balance is below opening balance for the statement period.";
}

export function buildBankDocumentInventory(input: {
  reads: ChanakyaDocumentContentReadResult[];
  fileSizeByDocId?: Map<string, number>;
  binarySourceByDocId?: Map<string, "inline" | "object_store" | "none">;
  storageKeyByDocId?: Map<string, boolean>;
  binaryAbsentReasonByDocId?: Map<string, string>;
}): ChanakyaCreditBankDocumentInventoryItem[] {
  const bankReads = input.reads.filter((r) =>
    isBankStatementDocument({
      displayName: r.displayName,
      typeRef: r.typeRef,
      familyHint: r.familyHint,
    }),
  );

  return bankReads.map((r) => {
    const fileSizeBytes = input.fileSizeByDocId?.get(r.documentId) ?? r.byteLength ?? null;
    const binarySource =
      input.binarySourceByDocId?.get(r.documentId) ??
      (r.hasBinary ? "inline" : "none");
    const storageKey = input.storageKeyByDocId?.get(r.documentId) ?? false;

    const availabilityState = resolveBankDocumentState({
      isBankDocument: true,
      hasBinary: r.hasBinary,
      binarySource,
      fileSizeBytes: fileSizeBytes ?? 0,
      storageKey: storageKey ? "present" : null,
      readStatus: r.status,
      limitation: r.limitation,
      binaryAbsentReason:
        input.binaryAbsentReasonByDocId?.get(r.documentId) ?? null,
    });

    const evidenceTier = resolveBankEvidenceTier({
      availabilityState,
      hasCoreFinancialFacts: false,
    });

    return {
      documentId: r.documentId,
      documentName: r.displayName,
      availabilityState,
      evidenceTier,
      binarySource,
      fileSizeBytes,
      limitation: r.limitation,
    };
  });
}

export function buildBankingAnalysisFromEvidence(input: {
  facts: ChanakyaDocumentExtractedFact[];
  reads: ChanakyaDocumentContentReadResult[];
  fileSizeByDocId?: Map<string, number>;
  binarySourceByDocId?: Map<string, "inline" | "object_store" | "none">;
  storageKeyByDocId?: Map<string, boolean>;
  binaryAbsentReasonByDocId?: Map<string, string>;
  financialProfile?: ChanakyaCreditFinancialProfile;
  gstAnalysis?: ChanakyaCreditGstAnalysis;
}): ChanakyaCreditBankingAnalysis {
  const documentInventory = buildBankDocumentInventory(input);
  const bankReads = input.reads.filter((r) =>
    isBankStatementDocument({
      displayName: r.displayName,
      typeRef: r.typeRef,
      familyHint: r.familyHint,
    }),
  );

  const emptyAggregate = {
    totalCredits: null as string | null,
    totalDebits: null as string | null,
    averageBalance: null as string | null,
    minimumBalance: null as string | null,
    maximumBalance: null as string | null,
    emiIndicators: [] as string[],
    chequeReturnIndicators: [] as string[],
  };

  const emptyBankingTrend = {
    availability: "NOT_AVAILABLE" as const,
    direction: "NOT_AVAILABLE" as const,
    observations: [] as string[],
  };

  const bankVsTurnoverEmpty: ChanakyaCreditBankVsTurnoverReconciliation = {
    availability: "NOT_AVAILABLE",
    status: "NOT_AVAILABLE",
    bankCredits: null,
    gstTurnover: null,
    financialTurnover: null,
    bankPeriod: null,
    gstPeriod: null,
    financialPeriod: null,
    explanation: "Banking binary unavailable — bank vs turnover reconciliation NOT_AVAILABLE.",
  };

  const presentOnlyStates: ChanakyaBankDocumentAvailabilityState[] = [
    "metadata_only",
    "binary_unavailable",
  ];

  const readableStates: ChanakyaBankDocumentAvailabilityState[] = ["readable"];
  const hasReadableBank = documentInventory.some((d) =>
    readableStates.includes(d.availabilityState),
  );
  const hasPresentOnly = documentInventory.some((d) =>
    presentOnlyStates.includes(d.availabilityState),
  );

  const makePresentAccount = (
    inv: ChanakyaCreditBankDocumentInventoryItem,
  ): ChanakyaCreditBankAccountSummary => ({
    documentId: inv.documentId,
    documentName: inv.documentName,
    availabilityState: inv.availabilityState,
    evidenceTier: resolveBankEvidenceTier({
      availabilityState: inv.availabilityState,
      hasCoreFinancialFacts: false,
    }),
    statementPeriodComplete: false,
    bankName: null,
    statementPeriod: null,
    accountType: null,
    openingBalance: null,
    closingBalance: null,
    transactionCount: null,
    totalCredits: null,
    totalDebits: null,
    averageBalance: null,
    emiIndicators: [],
    chequeReturnIndicators: [],
    concentrationObservations: [],
    facts: [],
    provenance: [],
  });

  if (!hasReadableBank) {
    const aggregateTier = resolveAggregateBankEvidenceTier(
      documentInventory.map((d) => d.evidenceTier),
    );
    return {
      availability: "NOT_AVAILABLE",
      evidenceTier: aggregateTier,
      documentInventory,
      accounts: documentInventory
        .filter((d) => presentOnlyStates.includes(d.availabilityState))
        .map(makePresentAccount),
      bankingTrend: emptyBankingTrend,
      aggregate: emptyAggregate,
      bankVsTurnover: bankVsTurnoverEmpty,
      limitation:
        hasPresentOnly && bankReads.length > 0
          ? documentInventory.some((d) => d.availabilityState === "binary_unavailable")
            ? "Bank statement metadata present but durable binary could not be retrieved — banking analysis NOT_AVAILABLE."
            : "Bank statement metadata present but readable content unavailable — banking analysis NOT_AVAILABLE."
          : bankReads.length > 0
            ? "No readable bank statement content available."
            : "No bank statement documents identified.",
    };
  }

  const bankFacts = input.facts.filter(
    (f) => isBankFactKey(f.key) && isReliableBankFact(f),
  );
  const indicatorFacts = input.facts.filter((f) => INDICATOR_KEYS.has(f.key));

  const byDoc = new Map<string, ChanakyaDocumentExtractedFact[]>();
  for (const f of [...bankFacts, ...indicatorFacts]) {
    const list = byDoc.get(f.provenance.documentId) ?? [];
    list.push(f);
    byDoc.set(f.provenance.documentId, list);
  }

  const readableDocs = documentInventory.filter((d) => d.availabilityState === "readable");

  const accounts: ChanakyaCreditBankAccountSummary[] = readableDocs.map((inv) => {
    const read = bankReads.find((r) => r.documentId === inv.documentId);
    const docFacts = byDoc.get(inv.documentId) ?? [];
    const mapped: ChanakyaCreditFinancialFact[] = docFacts
      .filter((f) => CORE_BANK_KEYS.has(f.key))
      .map((f) => ({
        field: f.key,
        label: f.label,
        value: f.value,
        unit: f.unit ?? null,
        financialYear: f.periodLabel ?? null,
        section: "Other",
        provenance: localFactProvenance(f),
      }));

    const opening = docFacts.find((f) => f.key === "opening_balance")?.value ?? null;
    const closing = docFacts.find((f) => f.key === "closing_balance")?.value ?? null;
    const statedAvg = docFacts.find((f) => f.key === "average_balance")?.value ?? null;
    const statementPeriod =
      docFacts.find((f) => f.key === "statement_period")?.value ?? null;
    const periodAssessment = assessStatementPeriodCompleteness({
      statementPeriod,
      sourceText: read?.textExcerpt ?? null,
    });
    const avg = deriveAverageBalanceFromEvidence({
      opening,
      closing,
      statedAverage: statedAvg,
      statementPeriodComplete: periodAssessment.complete,
    });

    const emiIndicators = docFacts
      .filter((f) => f.key === "emi_indicator")
      .map((f) => f.value);
    const chequeReturnIndicators = docFacts
      .filter((f) => f.key === "cheque_return_indicator")
      .map((f) => f.value);
    const concentrationObservations = docFacts
      .filter((f) => f.key === "concentration_observation")
      .map((f) => f.value);

    const movement = balanceMovementObservation(opening, closing);
    if (movement) {
      concentrationObservations.push(movement);
    }
    if (!periodAssessment.complete && periodAssessment.reason) {
      concentrationObservations.push(periodAssessment.reason);
    }

    const totalCredits = docFacts.find((f) => f.key === "total_credits")?.value ?? null;
    const totalDebits = docFacts.find((f) => f.key === "total_debits")?.value ?? null;
    const evidenceTier = resolveBankEvidenceTier({
      availabilityState: inv.availabilityState,
      hasCoreFinancialFacts: Boolean(
        opening || closing || totalCredits || totalDebits,
      ),
    });

    return {
      documentId: inv.documentId,
      documentName: inv.documentName,
      availabilityState: inv.availabilityState,
      evidenceTier,
      statementPeriodComplete: periodAssessment.complete,
      bankName: docFacts.find((f) => f.key === "bank_name")?.value ?? null,
      statementPeriod,
      accountType: docFacts.find((f) => f.key === "account_type")?.value ?? null,
      openingBalance: opening,
      closingBalance: closing,
      transactionCount: docFacts.find((f) => f.key === "transaction_count")
        ? Number(docFacts.find((f) => f.key === "transaction_count")!.value)
        : null,
      totalCredits,
      totalDebits,
      averageBalance: avg.value,
      emiIndicators,
      chequeReturnIndicators,
      concentrationObservations,
      facts: mapped,
      provenance: mapped.map((f) => f.provenance),
    };
  });

  // Present-only accounts listed separately (no facts).
  for (const inv of documentInventory.filter((d) =>
    presentOnlyStates.includes(d.availabilityState),
  )) {
    if (!accounts.some((a) => a.documentId === inv.documentId)) {
      accounts.push(makePresentAccount(inv));
    }
  }

  let totalCreditsNum = 0;
  let totalDebitsNum = 0;
  let creditsKnown = false;
  let debitsKnown = false;
  const allEmi: string[] = [];
  const allChq: string[] = [];
  const balanceSamples: number[] = [];

  for (const a of accounts.filter((x) => x.availabilityState === "readable")) {
    const c = a.totalCredits ? parseBankNumeric(a.totalCredits, "inr") : null;
    const d = a.totalDebits ? parseBankNumeric(a.totalDebits, "inr") : null;
    if (c != null) {
      totalCreditsNum += c;
      creditsKnown = true;
    }
    if (d != null) {
      totalDebitsNum += d;
      debitsKnown = true;
    }
    if (a.averageBalance) {
      const b = parseBankNumeric(a.averageBalance, "inr");
      if (b != null) balanceSamples.push(b);
    }
    allEmi.push(...a.emiIndicators);
    allChq.push(...a.chequeReturnIndicators);
  }

  const aggregate = {
    totalCredits: creditsKnown ? String(totalCreditsNum) : null,
    totalDebits: debitsKnown ? String(totalDebitsNum) : null,
    averageBalance:
      balanceSamples.length > 0
        ? String(
            balanceSamples.reduce((s, v) => s + v, 0) / balanceSamples.length,
          )
        : null,
    minimumBalance: null,
    maximumBalance: null,
    emiIndicators: [...new Set(allEmi)],
    chequeReturnIndicators: [...new Set(allChq)],
  };

  const availability =
    accounts.some(
      (a) =>
        a.evidenceTier === "FINANCIALLY_USEFUL" &&
        (a.openingBalance || a.closingBalance || a.totalCredits),
    )
      ? "AVAILABLE"
      : accounts.some((a) => a.evidenceTier === "READABLE")
        ? "PARTIAL"
        : "NOT_AVAILABLE";

  const bankingTrend = buildBankingTrendFromAccounts(accounts);
  const evidenceTier = resolveAggregateBankEvidenceTier(
    accounts.map((a) => a.evidenceTier),
  );

  const refreshedInventory = documentInventory.map((item) => {
    const account = accounts.find((a) => a.documentId === item.documentId);
    return account
      ? { ...item, evidenceTier: account.evidenceTier }
      : item;
  });

  const bankVsTurnover = buildBankVsTurnoverReconciliation({
    bankingAnalysis: {
      availability,
      documentInventory: refreshedInventory,
      accounts,
      aggregate,
      bankVsTurnover: bankVsTurnoverEmpty,
      limitation: null,
    },
    gstAnalysis: input.gstAnalysis,
    financialProfile: input.financialProfile,
  });

  return {
    availability,
    evidenceTier,
    documentInventory: refreshedInventory,
    accounts,
    bankingTrend,
    aggregate,
    bankVsTurnover,
    limitation:
      availability === "PARTIAL"
        ? "Readable bank statements found but labeled balance/credit facts were not fully extracted."
        : null,
  };
}

export function buildBankVsTurnoverReconciliation(input: {
  bankingAnalysis: Pick<
    ChanakyaCreditBankingAnalysis,
    "availability" | "aggregate" | "accounts" | "documentInventory" | "bankVsTurnover" | "limitation"
  >;
  gstAnalysis?: ChanakyaCreditGstAnalysis;
  financialProfile?: ChanakyaCreditFinancialProfile;
}): ChanakyaCreditBankVsTurnoverReconciliation {
  if (input.bankingAnalysis.availability === "NOT_AVAILABLE") {
    return {
      availability: "NOT_AVAILABLE",
      status: "NOT_AVAILABLE",
      bankCredits: null,
      gstTurnover: null,
      financialTurnover: null,
      bankPeriod: null,
      gstPeriod: null,
      financialPeriod: null,
      explanation: "Banking binary unavailable — bank vs turnover reconciliation NOT_AVAILABLE.",
    };
  }

  const bankCredits = input.bankingAnalysis.aggregate.totalCredits;
  const bankPeriod =
    input.bankingAnalysis.accounts.find((a) => a.statementPeriod)?.statementPeriod ?? null;

  const gstReturn = input.gstAnalysis?.returns.find(
    (r) => r.taxableTurnover && r.provenance.every((p) => p.confidence !== "ambiguous"),
  );
  const gstTurnover = gstReturn?.taxableTurnover ?? null;
  const gstPeriod = gstReturn?.returnPeriod ?? null;

  const revenueFacts =
    input.financialProfile?.allFacts.filter(
      (f) => f.field === "revenue" && f.provenance.confidence !== "ambiguous",
    ) ?? [];
  const latestRevenue = revenueFacts[revenueFacts.length - 1];
  const financialTurnover = latestRevenue?.value ?? null;
  const financialPeriod = latestRevenue?.financialYear ?? null;

  if (!bankCredits) {
    return {
      availability: "NOT_AVAILABLE",
      status: "NOT_AVAILABLE",
      bankCredits: null,
      gstTurnover,
      financialTurnover,
      bankPeriod,
      gstPeriod,
      financialPeriod,
      explanation:
        "Bank credits not extracted for a comparable period — reconciliation NOT_AVAILABLE.",
    };
  }

  const numBank = parseBankNumeric(bankCredits, "inr");
  const numGst = gstTurnover ? parseBankNumeric(gstTurnover, "inr") : null;
  const numFin = financialTurnover
    ? parseBankNumeric(financialTurnover, latestRevenue?.unit)
    : null;

  let status: ChanakyaCreditBankVsTurnoverReconciliation["status"] = "NOT_RECONCILABLE";
  let explanation =
    "Bank credits, GST turnover, and financial turnover require comparable periods — variance requiring verification.";

  if (numBank != null && numGst != null && bankPeriod && gstPeriod) {
    const ratio = Math.min(numBank, numGst) / Math.max(numBank, numGst);
    if (ratio >= 0.85) status = "BROADLY_CONSISTENT";
    else status = "VARIANCE_IDENTIFIED";
    explanation =
      status === "VARIANCE_IDENTIFIED"
        ? "Bank credits differ from GST taxable turnover for the available periods — variance requiring verification."
        : "Bank credits broadly align with GST taxable turnover for the available periods.";
  } else if (numBank != null && numFin != null) {
    explanation =
      "Bank credits and financial turnover present but periods may not be directly comparable — variance requiring verification.";
    status = "NOT_RECONCILABLE";
  }

  return {
    availability: "PARTIAL",
    status,
    bankCredits,
    gstTurnover,
    financialTurnover,
    bankPeriod,
    gstPeriod,
    financialPeriod,
    explanation,
  };
}

export { bankStateAllowsFactExtraction, resolveBankDocumentState, isBankStatementDocument };
