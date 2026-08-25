/**
 * CO-CHANAKYA-CREDIT-WORKBENCH-004 — Internal-only strengthening recommendations.
 * Never include in lender-facing proposal / email / PDF / Send to Lender.
 */

import type { ChanakyaInternalStrengtheningRecommendation } from "@/types/chanakya-credit-proposal";
import {
  classifyDocumentPresence,
  type DocumentPresenceHint,
} from "./derive-evidence-readiness";

export function buildInternalStrengtheningRecommendations(input: {
  documents: DocumentPresenceHint[];
  hasStatedIncome?: boolean;
  hasStatedTurnover?: boolean;
  hasPropertyContext?: boolean;
}): ChanakyaInternalStrengtheningRecommendation[] {
  const flags = classifyDocumentPresence(input.documents);
  const out: ChanakyaInternalStrengtheningRecommendation[] = [];

  if (!flags.gst) {
    out.push({
      id: "gst_returns",
      title: "GST Returns",
      categoryHint: "gst",
      reason:
        "Would allow validation of reported turnover against GST-reported sales once extraction is available.",
    });
  }
  if (!flags.banking) {
    out.push({
      id: "bank_statements",
      title: "Bank Statements",
      categoryHint: "banking",
      reason:
        "Would allow assessment of average bank balance, banking turnover, EMI servicing and cheque-return behaviour once extraction is available.",
    });
  }
  if (!flags.financialStatements) {
    out.push({
      id: "financial_statements",
      title: "Additional Financial Year / Statements",
      categoryHint: "financial_statements",
      reason:
        "Would allow a stronger revenue and profitability trend analysis once statement extraction is available.",
    });
  }
  if (!flags.itr) {
    out.push({
      id: "itr",
      title: "ITR",
      categoryHint: "itr",
      reason:
        "Would allow cross-checking of reported income against tax filings once extraction is available.",
    });
  }
  if (!flags.salary && !input.hasStatedIncome && !input.hasStatedTurnover) {
    out.push({
      id: "income_evidence",
      title: "Salary slips / income evidence",
      categoryHint: "salary",
      reason:
        "Would strengthen income visibility for salaried or mixed-income assessments once extraction is available.",
    });
  }
  if (!flags.auditor && flags.financialStatements) {
    out.push({
      id: "auditor_report",
      title: "Auditor's Report",
      categoryHint: "auditor",
      reason:
        "Would allow review of qualifications, emphasis of matter, and material accounting observations.",
    });
  }
  if (input.hasPropertyContext && !flags.property) {
    out.push({
      id: "property_docs",
      title: "Property / title documents",
      categoryHint: "property",
      reason:
        "Would corroborate stated property / security information with document evidence.",
    });
  }

  out.push({
    id: "edie_extraction",
    title: "Structured document extraction (EDIE)",
    reason:
      "OCR / table extraction is not yet available. CHANAKYA currently uses document presence only and does not invent financial figures from filenames.",
  });

  return out;
}
