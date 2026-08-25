/**
 * CO-CHANAKYA-CREDIT-PROPOSAL-002 — Compose lender-facing draft from evidence only.
 * Never invents FOIR/DSCR/LTV or document-extracted financial values.
 */

import { randomUUID } from "node:crypto";
import {
  CHANAKYA_CREDIT_PROPOSAL_NO_EXTRACTION_NOTICE,
  CHANAKYA_CREDIT_PROPOSAL_SECTIONS,
  CHANAKYA_CREDIT_PROPOSAL_UNAVAILABLE,
} from "@/constants/chanakya-credit-proposal";
import { formatINR } from "@/lib/format-currency";
import type { ChanakyaCreditProposalContextPack } from "./gather-context";
import type {
  ChanakyaCreditProposalDraft,
  ChanakyaCreditProposalEvidenceSource,
  ChanakyaCreditProposalSection,
  ChanakyaCreditProposalSectionId,
} from "@/types/chanakya-credit-proposal";

function line(label: string, value: string | null | undefined): string {
  const v = value?.trim() ? value.trim() : CHANAKYA_CREDIT_PROPOSAL_UNAVAILABLE;
  return `- **${label}:** ${v}`;
}

function section(
  id: ChanakyaCreditProposalSectionId,
  body: string,
  evidenceSources: ChanakyaCreditProposalEvidenceSource[],
): ChanakyaCreditProposalSection {
  const meta = CHANAKYA_CREDIT_PROPOSAL_SECTIONS.find((s) => s.id === id)!;
  return { id, title: meta.title, body: body.trim(), evidenceSources };
}

export function composeChanakyaCreditProposalDraft(
  ctx: ChanakyaCreditProposalContextPack,
): ChanakyaCreditProposalDraft {
  const amountLabel =
    ctx.loanAmount > 0 ? formatINR(ctx.loanAmount) : CHANAKYA_CREDIT_PROPOSAL_UNAVAILABLE;

  const verifiedCount = ctx.documents.filter((d) => d.verified).length;
  const pendingCount = ctx.documents.filter((d) =>
    /pending|requested|missing/i.test(d.status),
  ).length;

  const docLines =
    ctx.documents.length === 0
      ? `- ${CHANAKYA_CREDIT_PROPOSAL_UNAVAILABLE}`
      : ctx.documents
          .slice(0, 24)
          .map(
            (d) =>
              `- ${d.name} — status: ${d.status}${d.verified ? " (verified stamp present)" : ""} [presence only]`,
          )
          .join("\n");

  const statedLines = [
    line("Stated monthly income", ctx.stated.statedIncomeMonthly),
    line("Stated obligations", ctx.stated.statedObligations),
    line("Stated turnover", ctx.stated.statedTurnover),
    line("Business vintage", ctx.stated.statedBusinessVintage),
    line("Nature of business", ctx.stated.statedNatureOfBusiness),
    line("Constitution", ctx.stated.statedConstitution),
    line("Property type", ctx.stated.statedPropertyType),
    line("Property value (stated)", ctx.stated.statedPropertyValue),
    line("Property location", ctx.stated.statedPropertyLocation),
  ].join("\n");

  const strengths: string[] = [];
  if (ctx.loanAmount > 0 && ctx.productName !== "Not Specified") {
    strengths.push("Product and required amount are captured on the Opportunity.");
  }
  if (ctx.stated.statedIncomeMonthly || ctx.stated.statedTurnover) {
    strengths.push("Credit Workbench stated income / turnover information has been provided.");
  }
  if (verifiedCount > 0) {
    strengths.push(
      `${verifiedCount} document(s) carry a verification stamp (presence verified — content not extracted).`,
    );
  }
  if (ctx.relationshipManagerName) {
    strengths.push(`Named relationship manager: ${ctx.relationshipManagerName}.`);
  }
  if (strengths.length === 0) {
    strengths.push(
      "Insufficient structured evidence to assert credit strengths beyond Opportunity identity.",
    );
  }

  const considerations = [
    CHANAKYA_CREDIT_PROPOSAL_NO_EXTRACTION_NOTICE,
    "FOIR, DSCR, LTV, and banking analysis are not computed in this phase.",
    ...ctx.gaps.filter(
      (g) =>
        !g.includes("OCR") &&
        !g.includes("FOIR") &&
        !g.includes("External web"),
    ),
  ];
  if (pendingCount > 0) {
    considerations.push(
      `${pendingCount} document(s) remain pending/requested — collection should continue in Document Center.`,
    );
  }

  const sections: ChanakyaCreditProposalSection[] = [
    section(
      "executive_summary",
      [
        `This is a **draft** lender-facing credit proposal prepared by CHANAKYA inside Catalyst One.`,
        ``,
        line("Opportunity", ctx.opportunityNumber),
        line("Borrower", ctx.borrowerName),
        line("Product", ctx.productName),
        line("Required amount", amountLabel),
        line("Lender (desk)", ctx.lenderName),
        ``,
        `CHANAKYA has reviewed authorized transaction context, document **presence**, Credit Workbench stated verification, and available lender/product labels. Structured financial extraction and ratio engines are **not** available yet — no fabricated ratios or statement figures are included.`,
      ].join("\n"),
      ["transaction", "credit_workbench", "documents", "lender_product", "chanakya_inference"],
    ),
    section(
      "borrower_overview",
      [
        line("Primary borrower / contact", ctx.borrowerName),
        line("Company", ctx.companyName),
        line("Employment / borrower type", ctx.employmentType),
        line("City", ctx.city),
        line("Transaction type", ctx.transactionType),
      ].join("\n"),
      ["transaction"],
    ),
    section(
      "loan_requirement",
      [
        line("Product", ctx.productName),
        line("Required amount", amountLabel),
        line("Purpose", ctx.purpose),
      ].join("\n"),
      ["transaction"],
    ),
    section(
      "business_overview",
      [
        `Overview is limited to Opportunity and Credit Workbench stated fields.`,
        ``,
        line("Nature of business (stated)", ctx.stated.statedNatureOfBusiness),
        line("Constitution (stated)", ctx.stated.statedConstitution),
        line("Business vintage (stated)", ctx.stated.statedBusinessVintage),
        line("Turnover (stated)", ctx.stated.statedTurnover),
        ``,
        `External company/industry research is **not enabled** in Phase 1.`,
      ].join("\n"),
      ["credit_workbench", "transaction"],
    ),
    section(
      "stated_financial",
      [
        `The following values are **stated verification inputs** from Credit Workbench (SOURCE: credit_workbench). They are not EDIE-extracted financial statement facts.`,
        ``,
        statedLines,
        ``,
        ctx.stated.notes?.trim()
          ? line("Verification notes", ctx.stated.notes)
          : line("Verification notes", null),
      ].join("\n"),
      ["credit_workbench"],
    ),
    section(
      "document_readiness",
      [
        `Document inventory reflects **presence and status only**.`,
        ``,
        docLines,
        ``,
        `> ${CHANAKYA_CREDIT_PROPOSAL_NO_EXTRACTION_NOTICE}`,
      ].join("\n"),
      ["documents"],
    ),
    section(
      "credit_observations",
      [
        `- Opportunity identity and product/amount framing are available from Catalyst One.`,
        `- Credit Workbench stated fields: ${
          ctx.stated.statedIncomeMonthly || ctx.stated.statedTurnover
            ? "partially available"
            : "largely incomplete"
        }.`,
        `- Documents on record: ${ctx.documents.length}; verification stamps: ${verifiedCount}.`,
        `- Calculated credit ratios (FOIR / DSCR / LTV / banking): **not available** — engine SSOT pending.`,
        `- CHANAKYA does not assert underwriting eligibility in this draft.`,
      ].join("\n"),
      ["transaction", "credit_workbench", "documents", "chanakya_inference"],
    ),
    section(
      "strengths",
      strengths.map((s) => `- ${s}`).join("\n"),
      ["chanakya_inference", "transaction", "credit_workbench", "documents"],
    ),
    section(
      "key_considerations",
      considerations.map((c) => `- ${c}`).join("\n"),
      ["chanakya_inference", "documents", "edie_facts"],
    ),
    section(
      "proposed_structure",
      [
        line("Facility / product", ctx.productName),
        line("Indicative ticket", amountLabel),
        line("Proposed lender", ctx.lenderName),
        line("Tenure / ROI / LTV / FOIR ceilings", null),
        ``,
        `Detailed structure (tenure, pricing, security perfection, FOIR/LTV fit) requires lender program parameters plus financial-analysis SSOT — both are out of scope for Phase 1 generation.`,
      ].join("\n"),
      ["transaction", "lender_product"],
    ),
    section(
      "recommendation",
      [
        `**Draft recommendation (advisory only):** Proceed to complete document collection and Credit Workbench verification. Do **not** treat this draft as a final credit decision.`,
        ``,
        `Next human-controlled steps:`,
        `1. Review this draft for accuracy against Catalyst One records.`,
        `2. Complete missing stated information and mandatory documents.`,
        `3. Re-run MAKE PROPOSAL after financial/EDIE capabilities are available.`,
        `4. **Send to Lender** remains a separate explicit user action — CHANAKYA will not send automatically.`,
      ].join("\n"),
      ["chanakya_inference"],
    ),
  ];

  const fullText = sections.map((s) => `## ${s.title}\n\n${s.body}`).join("\n\n");

  return {
    draftId: `ccp_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
    opportunityId: ctx.opportunityId,
    opportunityNumber: ctx.opportunityNumber,
    productName: ctx.productName,
    loanAmount: ctx.loanAmount,
    status: "draft",
    emailOutboundOwner: "catalyst_one",
    readOnly: true,
    autoSendForbidden: true,
    sections,
    fullText,
    evidence: ctx.evidence,
    gaps: ctx.gaps,
    generatedAt: new Date().toISOString(),
  };
}
