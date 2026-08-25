/**
 * CO-CHANAKYA-CREDIT-WORKBENCH-004 — Evidence-first Proposal Readiness.
 * Qualitative assessment from transaction + document presence only.
 * Never fabricates OCR / ratios / approval probability. Never blocks proposal.
 */

import { CHANAKYA_PROPOSAL_READINESS_CAPABILITY_NOTE } from "@/constants/chanakya-credit-proposal";
import type {
  ChanakyaEvidenceVisibilityLevel,
  ChanakyaProposalEvidenceReadiness,
} from "@/types/chanakya-credit-proposal";

export interface DocumentPresenceHint {
  name: string;
  status: string;
  typeRef?: string;
}

export interface EvidenceReadinessInput {
  productName: string;
  loanAmount: number;
  purpose?: string | null;
  employmentType?: string | null;
  companyName?: string | null;
  city?: string | null;
  stated?: {
    statedIncomeMonthly?: string;
    statedTurnover?: string;
    statedNatureOfBusiness?: string;
    statedPropertyType?: string;
    statedPropertyValue?: string;
    statedPropertyLocation?: string;
  };
  documents: DocumentPresenceHint[];
  lenderName?: string | null;
}

function haystack(d: DocumentPresenceHint): string {
  return `${d.name} ${d.typeRef ?? ""} ${d.status}`.toLowerCase();
}

export function classifyDocumentPresence(docs: DocumentPresenceHint[]) {
  const flags = {
    financialStatements: false,
    banking: false,
    salary: false,
    itr: false,
    gst: false,
    identity: false,
    property: false,
    auditor: false,
    director: false,
  };
  for (const d of docs) {
    const h = haystack(d);
    if (
      /p\s*&\s*l|profit\s*and\s*loss|balance\s*sheet|financial\s*statement|audited\s*financial|ebitda/i.test(
        h,
      )
    ) {
      flags.financialStatements = true;
    }
    if (/bank\s*statement|passbook|banking/i.test(h)) flags.banking = true;
    if (/salary\s*slip|payslip|form\s*16|salary/i.test(h)) flags.salary = true;
    if (/\bitr\b|income\s*tax|form\s*26/i.test(h)) flags.itr = true;
    if (/\bgst\b|gstr/i.test(h)) flags.gst = true;
    if (/\bpan\b|aadhaar|aadhar|passport|identity/i.test(h)) flags.identity = true;
    if (
      /property|sale\s*agreement|title\s*deed|valuation|noc|collateral|registry/i.test(h)
    ) {
      flags.property = true;
    }
    if (/auditor|audit\s*report/i.test(h)) flags.auditor = true;
    if (/director.?s?\s*report/i.test(h)) flags.director = true;
  }
  return flags;
}

function maxLevel(
  a: ChanakyaEvidenceVisibilityLevel,
  b: ChanakyaEvidenceVisibilityLevel,
): ChanakyaEvidenceVisibilityLevel {
  const order: ChanakyaEvidenceVisibilityLevel[] = [
    "none",
    "limited",
    "moderate",
    "good",
    "strong",
  ];
  return order[Math.max(order.indexOf(a), order.indexOf(b))]!;
}

function minLevel(
  a: ChanakyaEvidenceVisibilityLevel,
  b: ChanakyaEvidenceVisibilityLevel,
): ChanakyaEvidenceVisibilityLevel {
  const order: ChanakyaEvidenceVisibilityLevel[] = [
    "none",
    "limited",
    "moderate",
    "good",
    "strong",
  ];
  return order[Math.min(order.indexOf(a), order.indexOf(b))]!;
}

function hasText(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Derive evidence-base readiness for CHANAKYA proposal preparation.
 * scoreOutOf100 is always null until extraction engines exist (no fabricated %).
 */
export function deriveChanakyaProposalEvidenceReadiness(
  input: EvidenceReadinessInput,
): ChanakyaProposalEvidenceReadiness {
  const flags = classifyDocumentPresence(input.documents);
  const stated = input.stated ?? {};
  const docCount = input.documents.length;

  let evidenceCoverage: ChanakyaEvidenceVisibilityLevel = "none";
  if (docCount >= 8) evidenceCoverage = "strong";
  else if (docCount >= 4) evidenceCoverage = "good";
  else if (docCount >= 2) evidenceCoverage = "moderate";
  else if (docCount >= 1) evidenceCoverage = "limited";

  // Content extraction unavailable — financial visibility caps at "moderate" for presence.
  let financialVisibility: ChanakyaEvidenceVisibilityLevel = "none";
  if (flags.financialStatements || flags.salary || flags.itr) {
    financialVisibility = "moderate";
  } else if (hasText(stated.statedIncomeMonthly) || hasText(stated.statedTurnover)) {
    financialVisibility = "limited";
  }

  let bankingVisibility: ChanakyaEvidenceVisibilityLevel = flags.banking
    ? "moderate"
    : "none";

  let propertyVisibility: ChanakyaEvidenceVisibilityLevel = "none";
  if (flags.property) propertyVisibility = "moderate";
  if (
    hasText(stated.statedPropertyType) ||
    hasText(stated.statedPropertyValue) ||
    hasText(stated.statedPropertyLocation)
  ) {
    propertyVisibility = maxLevel(propertyVisibility, "limited");
    if (flags.property && hasText(stated.statedPropertyValue)) {
      propertyVisibility = "good";
    }
  }

  let businessVisibility: ChanakyaEvidenceVisibilityLevel = "none";
  if (hasText(input.companyName) || hasText(stated.statedNatureOfBusiness)) {
    businessVisibility = "limited";
  }
  if (hasText(stated.statedTurnover) || flags.gst || flags.auditor || flags.director) {
    businessVisibility = maxLevel(businessVisibility, "moderate");
  }
  if (
    (hasText(input.companyName) || hasText(stated.statedNatureOfBusiness)) &&
    (flags.gst || flags.financialStatements)
  ) {
    businessVisibility = maxLevel(businessVisibility, "good");
  }

  const txnBits = [
    input.loanAmount > 0,
    hasText(input.productName) && input.productName !== "Not Specified",
    hasText(input.purpose),
    hasText(input.employmentType),
    hasText(input.city),
  ].filter(Boolean).length;

  if (txnBits >= 4 && evidenceCoverage !== "none") {
    evidenceCoverage = maxLevel(evidenceCoverage, "good");
  } else if (txnBits >= 2) {
    evidenceCoverage = maxLevel(evidenceCoverage, "limited");
  }

  const levels: ChanakyaEvidenceVisibilityLevel[] = [
    evidenceCoverage,
    financialVisibility,
    bankingVisibility === "none" ? "limited" : bankingVisibility,
    propertyVisibility === "none" ? "limited" : propertyVisibility,
    businessVisibility === "none" ? "limited" : businessVisibility,
  ];
  let overall: ChanakyaEvidenceVisibilityLevel = levels[0] ?? "limited";
  for (const l of levels.slice(1)) overall = minLevel(overall, l);
  // Soften floor when transaction identity is solid even if docs are thin.
  if (txnBits >= 3 && overall === "none") overall = "limited";

  const summaryParts = [
    `Evidence coverage: ${evidenceCoverage}.`,
    `Financial visibility: ${financialVisibility} (presence / stated only — content not extracted).`,
    `Banking visibility: ${bankingVisibility}.`,
    `Property visibility: ${propertyVisibility}.`,
    `Business visibility: ${businessVisibility}.`,
  ];

  return {
    overall,
    scoreOutOf100: null,
    evidenceCoverage,
    financialVisibility,
    bankingVisibility,
    propertyVisibility,
    businessVisibility,
    capabilityNote: CHANAKYA_PROPOSAL_READINESS_CAPABILITY_NOTE,
    blocksProposal: false,
    summary: summaryParts.join(" "),
  };
}
