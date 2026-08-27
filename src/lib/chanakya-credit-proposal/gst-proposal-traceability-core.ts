/**
 * CO-CHANAKYA-CREDIT-CERTIFICATION-019E — GST traceability in lender proposals.
 * Reuses 012 GST extraction SSOT — no second GST engine.
 */

import { CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE } from "@/constants/chanakya-credit-proposal";
import type {
  ChanakyaCreditFinancialProfile,
  ChanakyaCreditGstAnalysis,
  ChanakyaCreditGstMaterialFact,
  ChanakyaCreditGstReturnSummary,
  ChanakyaCreditGstVsFinancials,
} from "@/types/chanakya-credit-intelligence";

const MONTH_ORDER: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

function monthSortKey(period: string | null | undefined): number {
  if (!period?.trim()) return 999;
  const m = period.trim().toLowerCase().match(/^([a-z]+)/);
  return MONTH_ORDER[m?.[1] ?? ""] ?? 500;
}

function sortReturnsByPeriod(returns: ChanakyaCreditGstReturnSummary[]): ChanakyaCreditGstReturnSummary[] {
  return [...returns].sort((a, b) => {
    const ya = (a.returnPeriod || "").replace(/^\w+\s*/, "");
    const yb = (b.returnPeriod || "").replace(/^\w+\s*/, "");
    if (ya !== yb) return ya.localeCompare(yb);
    return monthSortKey(a.returnPeriod) - monthSortKey(b.returnPeriod);
  });
}

function reliableTurnoverRows(returns: ChanakyaCreditGstReturnSummary[]) {
  return sortReturnsByPeriod(returns).filter(
    (r) =>
      r.taxableTurnover?.trim() &&
      r.provenance.every((p) => p.confidence !== "ambiguous" && p.confidence !== "low"),
  );
}

function formatProvenanceRef(r: ChanakyaCreditGstReturnSummary): string {
  const conf = r.provenance.find((p) => p.field === "gst_taxable_turnover")?.confidence ?? "medium";
  const method =
    r.provenance.find((p) => p.field === "gst_taxable_turnover")?.extractionMethod ??
    "table_extraction";
  return `[${r.documentName}; ${method}; ${conf}]`;
}

export type GstProposalTraceabilityResult = {
  included: boolean;
  body: string;
  provenance: Array<{
    field: string;
    returnPeriod: string | null;
    value: string;
    documentId: string;
    documentName: string;
    unit: string | null;
    confidence: string;
    extractionMethod: string;
    category: string;
  }>;
  fieldsUsed: string[];
  sampleValues: Array<{ period: string; value: string; documentId: string }>;
  reconciliationLimitation: string | null;
};

export function collectGstMaterialFactsForProposal(
  gstAnalysis: ChanakyaCreditGstAnalysis,
): ChanakyaCreditGstMaterialFact[] {
  return gstAnalysis.materialFacts.filter((f) => f.lenderFacingEligible);
}

export function buildGstProposalTraceabilitySection(input: {
  gstAnalysis: ChanakyaCreditGstAnalysis;
  gstVsFinancials: ChanakyaCreditGstVsFinancials;
  financialProfile: ChanakyaCreditFinancialProfile;
}): GstProposalTraceabilityResult {
  const { gstAnalysis, gstVsFinancials, financialProfile } = input;
  const provenance: GstProposalTraceabilityResult["provenance"] = [];
  const sampleValues: GstProposalTraceabilityResult["sampleValues"] = [];
  const fieldsUsed = new Set<string>();

  if (gstAnalysis.availability === "NOT_AVAILABLE" || gstAnalysis.returns.length === 0) {
    return {
      included: false,
      body: "",
      provenance: [],
      fieldsUsed: [],
      sampleValues: [],
      reconciliationLimitation: gstAnalysis.reconciliationLimitation,
    };
  }

  const lines: string[] = [
    "Evidence-first GST return analysis from readable GSTR documents. Figures below trace to source documents — not summed into an invented annual aggregate.",
    "",
  ];

  if (gstAnalysis.identity.gstin) {
    fieldsUsed.add("gstin_identity");
    lines.push(
      `- **GSTIN (identity):** ${gstAnalysis.identity.gstin} — corroborated across ${gstAnalysis.identity.corroborationDocumentCount} return document(s). Identity repetition is not counted as separate financial insights.`,
    );
    for (const f of gstAnalysis.materialFacts.filter((x) => x.category === "gstin_identity")) {
      provenance.push({
        field: f.field,
        returnPeriod: f.returnPeriod,
        value: f.value,
        documentId: f.documentId,
        documentName: f.documentName,
        unit: f.unit,
        confidence: f.confidence,
        extractionMethod: f.extractionMethod,
        category: f.category,
      });
    }
  } else {
    lines.push(`- **GSTIN (identity):** ${CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE}`);
  }

  lines.push("");
  lines.push("**Taxable turnover (GST returns — period-wise, reliable confidence only):**");

  const turnoverRows = reliableTurnoverRows(gstAnalysis.returns);
  if (turnoverRows.length) {
    fieldsUsed.add("gst_taxable_turnover");
    for (const r of turnoverRows) {
      lines.push(
        `- **${r.returnPeriod || "Period not stated"}:** taxable turnover **${r.taxableTurnover}** (INR) ${formatProvenanceRef(r)}`,
      );
      sampleValues.push({
        period: r.returnPeriod || "—",
        value: r.taxableTurnover!,
        documentId: r.documentId,
      });
      const pf = r.provenance.find((p) => p.field === "gst_taxable_turnover");
      provenance.push({
        field: "gst_taxable_turnover",
        returnPeriod: r.returnPeriod,
        value: r.taxableTurnover!,
        documentId: r.documentId,
        documentName: r.documentName,
        unit: pf?.unit ?? "inr",
        confidence: pf?.confidence ?? "medium",
        extractionMethod: pf?.extractionMethod ?? "table_extraction",
        category: "taxable_turnover",
      });
    }
  } else {
    lines.push(`- ${CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE}`);
  }

  lines.push("");
  lines.push("**Reported turnover (financial statements — not summed from GST monthly returns):**");
  const revenueFacts = financialProfile.allFacts.filter(
    (f) => f.field === "revenue" && f.provenance.confidence !== "ambiguous",
  );
  if (revenueFacts.length) {
    fieldsUsed.add("reported_turnover_financial");
    for (const f of revenueFacts.slice(-3)) {
      lines.push(
        `- **${f.financialYear || "Period not stated"}:** ${f.label} **${f.value}**${f.unit ? ` (${f.unit})` : ""} — source: ${f.provenance.documentName} [${f.provenance.extractionMethod}; ${f.provenance.confidence}]`,
      );
      provenance.push({
        field: "revenue",
        returnPeriod: f.financialYear,
        value: f.value,
        documentId: f.provenance.documentId,
        documentName: f.provenance.documentName,
        unit: f.unit,
        confidence: f.provenance.confidence,
        extractionMethod: f.provenance.extractionMethod,
        category: "reported_turnover",
      });
    }
  } else {
    lines.push(`- ${CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE}`);
  }

  const otherFacts = gstAnalysis.materialFacts.filter(
    (f) => f.category === "other_gst" && f.lenderFacingEligible && f.field !== "gst_period",
  );
  if (otherFacts.length) {
    lines.push("");
    lines.push("**Other GST values (document-extracted):**");
    for (const f of otherFacts.slice(0, 12)) {
      fieldsUsed.add(f.field);
      lines.push(
        `- **${f.label}** (${f.returnPeriod || "—"}): **${f.value}** — ${f.documentName} [${f.extractionMethod}; ${f.confidence}]`,
      );
      provenance.push({
        field: f.field,
        returnPeriod: f.returnPeriod,
        value: f.value,
        documentId: f.documentId,
        documentName: f.documentName,
        unit: f.unit,
        confidence: f.confidence,
        extractionMethod: f.extractionMethod,
        category: f.category,
      });
    }
  }

  if (gstVsFinancials.availability !== "NOT_AVAILABLE" && gstVsFinancials.explanation) {
    lines.push("");
    const outcome = gstVsFinancials.comparisonOutcome ?? "NOT_AVAILABLE";
    lines.push(
      `- **GST vs financial reconciliation:** ${outcome} (${gstVsFinancials.status.replace(/_/g, " ").toLowerCase()}; period ${gstVsFinancials.periodAlignment ?? "n/a"}) — ${gstVsFinancials.explanation}`,
    );
  }

  const limitation =
    gstAnalysis.reconciliationLimitation ||
    (gstAnalysis.annualTurnoverNotComputed
      ? "Annual turnover was not computed by summing monthly GST return figures — incompatible period aggregation is prohibited."
      : null);

  if (limitation) {
    lines.push("");
    lines.push(`**Reconciliation limitation:** ${limitation}`);
  }

  return {
    included: turnoverRows.length > 0 || Boolean(gstAnalysis.identity.gstin),
    body: lines.join("\n"),
    provenance,
    fieldsUsed: [...fieldsUsed],
    sampleValues,
    reconciliationLimitation: limitation,
  };
}
