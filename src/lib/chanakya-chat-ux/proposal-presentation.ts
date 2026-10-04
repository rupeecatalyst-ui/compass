/**
 * CO-C1-CHANAKYA-CHAT-WORKSPACE-UX-011
 * Present Credit Workbench proposal drafts as snapshot + accordion.
 * UI-only; does not invent business facts.
 */

import { CHANAKYA_CHAT_NOT_AVAILABLE_ONCE } from "@/constants/chanakya-chat-ux";
import { formatINR } from "@/lib/format-currency";
import type { ChanakyaCreditProposalDraft, ChanakyaCreditProposalSection } from "@/types/chanakya-credit-proposal";
import type {
  ChanakyaProposalAccordionSection,
  ChanakyaProposalPresentation,
  ChanakyaProposalSnapshotField,
} from "@/types/chanakya-chat-ux";

const UNAVAILABLE_RE = /not available in catalyst one|information was not available/i;

const ACCORDION_ORDER: Array<{ id: string; title: string; sectionIds: string[] }> = [
  { id: "borrower", title: "Borrower/Promoter Profile", sectionIds: ["borrower_profile"] },
  { id: "business", title: "Business Profile", sectionIds: ["business_overview"] },
  { id: "facility", title: "Facility and Purpose", sectionIds: ["facility_purpose", "loan_requirement"] },
  { id: "financial", title: "Financial Analysis", sectionIds: ["financial_analysis"] },
  { id: "banking", title: "Banking Analysis", sectionIds: ["banking_analysis"] },
  { id: "gst", title: "GST Analysis", sectionIds: ["gst_analysis"] },
  { id: "security", title: "Security/Collateral", sectionIds: ["property_security"] },
  { id: "strengths", title: "Strengths", sectionIds: ["key_positives"] },
  { id: "concerns", title: "Concerns and Deviations", sectionIds: ["key_concerns"] },
  { id: "mitigants", title: "Mitigants", sectionIds: ["mitigants"] },
  { id: "missing", title: "Missing Information", sectionIds: ["pending_information"] },
  { id: "recommendation", title: "Advisory Recommendation", sectionIds: ["recommendation"] },
];

function evidenceValue(draft: ChanakyaCreditProposalDraft, matcher: RegExp): string | null {
  const hit = draft.evidence.find(
    (item) => matcher.test(item.label) && item.available && item.value.trim(),
  );
  return hit?.value.trim() || null;
}

function field(label: string, value: string | null | undefined): ChanakyaProposalSnapshotField {
  const trimmed = value?.trim() || "";
  const missing = !trimmed || UNAVAILABLE_RE.test(trimmed);
  return {
    label,
    value: missing ? CHANAKYA_CHAT_NOT_AVAILABLE_ONCE : trimmed,
    missing,
  };
}

function sectionBody(sections: ChanakyaCreditProposalSection[], ids: string[]): string {
  return sections
    .filter((s) => s.included && ids.includes(s.id))
    .map((s) => s.body.trim())
    .filter(Boolean)
    .join("\n\n");
}

function collapseRepeatedUnavailable(body: string): string {
  const lines = body.split("\n");
  let seen = false;
  return lines
    .map((line) => {
      if (!UNAVAILABLE_RE.test(line)) return line;
      if (seen) return "";
      seen = true;
      return line.replace(UNAVAILABLE_RE, CHANAKYA_CHAT_NOT_AVAILABLE_ONCE);
    })
    .filter((line, idx, arr) => line.trim() || arr[idx - 1]?.trim())
    .join("\n")
    .trim();
}

export function buildChanakyaProposalPresentation(
  draft: ChanakyaCreditProposalDraft,
): ChanakyaProposalPresentation {
  const amount = draft.loanAmount > 0 ? formatINR(draft.loanAmount) : null;
  const customer = evidenceValue(draft, /customer|borrower|company|promoter/i) || null;
  const lender = evidenceValue(draft, /lender|bank|nbfc/i);
  const readiness = evidenceValue(draft, /readiness|evidence coverage|visibility/i);
  const missingItems = draft.gaps.filter((g) => g.trim()).slice(0, 8);

  const snapshot: ChanakyaProposalSnapshotField[] = [
    field("Customer/company", customer),
    field("Opportunity", draft.opportunityNumber),
    field("Product", draft.productName),
    field("Amount", amount),
    field("Selected lender", lender),
    field("Evidence readiness", readiness),
  ];

  const executive =
    collapseRepeatedUnavailable(sectionBody(draft.sections, ["executive_summary"])) ||
    "Proposal snapshot is ready from authorised Catalyst One evidence.";

  const priorityMissing = missingItems.length > 0;

  const sections: ChanakyaProposalAccordionSection[] = ACCORDION_ORDER.map((row) => {
    let body = collapseRepeatedUnavailable(sectionBody(draft.sections, row.sectionIds));
    if (row.id === "missing") {
      body = missingItems.length
        ? missingItems.map((item) => `- ${item}`).join("\n")
        : body || CHANAKYA_CHAT_NOT_AVAILABLE_ONCE;
    }

    const defaultOpen =
      row.id === "recommendation"
        ? false
        : row.sectionIds.includes("executive_summary")
          ? false
          : priorityMissing
            ? row.id === "missing"
            : row.id === "concerns" || row.id === "strengths";

    return {
      id: row.id,
      title: row.title,
      body: body || CHANAKYA_CHAT_NOT_AVAILABLE_ONCE,
      defaultOpen: Boolean(defaultOpen && body),
    };
  }).filter((row) => row.body.trim());

  const execOpen: ChanakyaProposalAccordionSection = {
    id: "executive",
    title: "Executive Summary",
    body: executive,
    defaultOpen: true,
  };

  const accordion: ChanakyaProposalAccordionSection[] = [
    execOpen,
    ...sections.map((s) => ({ ...s, defaultOpen: s.defaultOpen && s.id !== "executive" })),
  ];

  if (!priorityMissing) {
    const first = accordion.find((s) => s.id === "concerns" || s.id === "strengths");
    if (first) first.defaultOpen = true;
  } else {
    const missing = accordion.find((s) => s.id === "missing");
    if (missing) missing.defaultOpen = true;
  }

  const snapshotLines = snapshot.map((item) => `- **${item.label}:** ${item.value}`).join("\n");
  const missingBlock = missingItems.length
    ? `\n\n**Key missing information**\n${missingItems.map((item) => `- ${item}`).join("\n")}`
    : "";

  const conversationText = ["## Proposal Snapshot", snapshotLines, missingBlock, "", "## Executive Summary", executive]
    .join("\n")
    .trim();

  return {
    snapshot,
    executiveSummary: executive,
    sections: accordion,
    conversationText,
    draft,
  };
}

