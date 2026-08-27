/**
 * CO-CHANAKYA-CREDIT-WORKBENCH-004 / CO-CHANAKYA-CREDIT-INTELLIGENCE-016
 * Compose lender-facing draft from evidence only.
 */

import { randomUUID } from "node:crypto";
import {
  CHANAKYA_CREDIT_PROPOSAL_NO_EXTRACTION_NOTICE,
  CHANAKYA_CREDIT_PROPOSAL_SECTIONS,
  CHANAKYA_CREDIT_PROPOSAL_UNAVAILABLE,
  CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE,
} from "@/constants/chanakya-credit-proposal";
import { formatINR } from "@/lib/format-currency";
import type { ChanakyaCreditProposalContextPack } from "./gather-context";
import {
  buildLenderProposalIntelligence,
  shouldUseLenderProposalIntelligence,
} from "./lender-proposal-intelligence-core";
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
  included = true,
): ChanakyaCreditProposalSection {
  const meta = CHANAKYA_CREDIT_PROPOSAL_SECTIONS.find((s) => s.id === id)!;
  return { id, title: meta.title, body: body.trim(), evidenceSources, included };
}

function looksLikeUploadAsk(text: string): boolean {
  return /please (provide|upload|attach)|upload (gst|bank|itr|financial)|missing document recommendation/i.test(
    text,
  );
}

function composeLegacyChanakyaCreditProposalDraft(
  ctx: ChanakyaCreditProposalContextPack,
): ChanakyaCreditProposalDraft {
  const amountLabel =
    ctx.loanAmount > 0 ? formatINR(ctx.loanAmount) : CHANAKYA_CREDIT_PROPOSAL_UNAVAILABLE;

  const verifiedCount = ctx.documents.filter((d) => d.verified).length;

  const hasPropertyContext = Boolean(
    ctx.stated.statedPropertyType?.trim() ||
      ctx.stated.statedPropertyValue?.trim() ||
      ctx.stated.statedPropertyLocation?.trim() ||
      ctx.documents.some((d) =>
        /property|sale\s*agreement|title|valuation|collateral/i.test(
          `${d.name} ${d.typeRef}`,
        ),
      ),
  );

  const hasFinancialStated = Boolean(
    ctx.stated.statedIncomeMonthly?.trim() ||
      ctx.stated.statedTurnover?.trim() ||
      ctx.stated.statedObligations?.trim(),
  );

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
  ].join("\n");

  const strengths: string[] = [];
  if (ctx.loanAmount > 0 && ctx.productName !== "Not Specified") {
    strengths.push("Product and required amount are captured on the Opportunity.");
  }
  if (ctx.purpose) {
    strengths.push("Loan purpose is captured on the Opportunity.");
  }
  if (hasFinancialStated) {
    strengths.push(
      "Credit Workbench includes stated income / turnover / obligation inputs (user-entered verification — not document-extracted).",
    );
  }
  if (verifiedCount > 0) {
    strengths.push(
      `${verifiedCount} document(s) carry a verification stamp (presence verified — content not extracted).`,
    );
  }
  if (ctx.documents.length > 0) {
    strengths.push(
      `${ctx.documents.length} transaction document(s) are on record for review (presence only in this phase).`,
    );
  }
  if (ctx.relationshipManagerName) {
    strengths.push(`Named relationship manager: ${ctx.relationshipManagerName}.`);
  }
  if (ctx.rmNote) {
    strengths.push(
      "Additional transaction context was provided by the RM / Credit Officer (user-provided — not document evidence).",
    );
  }
  if (strengths.length === 0) {
    strengths.push(
      "Insufficient structured evidence to assert credit strengths beyond Opportunity identity.",
    );
  }

  const considerations = [
    CHANAKYA_CREDIT_PROPOSAL_NO_EXTRACTION_NOTICE,
    "FOIR, DSCR, LTV, and banking analysis are not computed in this phase.",
    ...ctx.gaps.filter((g) => !looksLikeUploadAsk(g)),
  ];
  if (ctx.documents.length === 0) {
    considerations.push(
      "Banking information was not available in the documents reviewed (no documents on record).",
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
        `Based on the information reviewed, CHANAKYA has used authorized transaction context, document presence, optional document text reading where binaries allow, Credit Workbench stated verification, and any RM / Credit Officer note provided as **user context**. Structured financial extraction and ratio engines are **not** available yet — no fabricated ratios or statement figures are included.`,
        ``,
        `This draft is not a lender credit decision.`,
      ].join("\n"),
      ["transaction", "credit_workbench", "documents", "lender_product", "rm_note", "chanakya_inference"],
    ),
    section(
      "borrower_profile",
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
        `Overview is limited to Opportunity and Credit Workbench stated fields in this phase.`,
        ``,
        line("Nature of business (stated)", ctx.stated.statedNatureOfBusiness),
        line("Constitution (stated)", ctx.stated.statedConstitution),
        line("Business vintage (stated)", ctx.stated.statedBusinessVintage),
        line("Turnover (stated)", ctx.stated.statedTurnover),
        ``,
        ctx.rmNote
          ? [
              `**RM / Credit Officer context (user-provided — not document evidence):**`,
              `As represented by the RM / Credit Officer: "${ctx.rmNote}"`,
            ].join("\n")
          : `No additional RM / Credit Officer note was provided.`,
        ``,
        `External company/industry research is **not enabled** in this phase.`,
      ].join("\n"),
      ["credit_workbench", "transaction", "rm_note"],
    ),
    section(
      "financial_analysis",
      [
        hasFinancialStated
          ? `The following values are **stated verification inputs** from Credit Workbench (SOURCE: credit_workbench). They are not EDIE-extracted financial statement facts.`
          : `Stated financial verification fields were largely incomplete. CHANAKYA does not invent salary, turnover, EBITDA, net profit, or banking figures. Based on the financial statements / income documents available for review: **content extraction is not yet available**, so no statement figures are asserted.`,
        ``,
        statedLines,
        ``,
        ctx.stated.notes?.trim()
          ? line("Verification working notes (Credit Workbench)", ctx.stated.notes)
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
      ["credit_workbench"],
      hasFinancialStated || Boolean(ctx.stated.notes?.trim()),
    ),
    section(
      "evidence_notes",
      [
        `Document inventory reflects presence, status, and honest content-reading outcomes.`,
        ``,
        docLines,
        ``,
        ctx.documentIntelligence.documentsWithReadableText > 0
          ? `CHANAKYA obtained readable text from ${ctx.documentIntelligence.documentsWithReadableText} document(s) via native text, real PDF.js extraction (unpdf), and/or configured vision OCR where applicable — only quality-gated content.`
          : `No document yielded readable text in this run. Scanned PDFs require OCR (Azure Document Intelligence or page rasterization) — not claimed here without a successful provider response.`,
        ``,
        ctx.documentIntelligence.structuredFacts.length > 0
          ? [
              `Structured facts extracted from readable text (labeled values only):`,
              ...ctx.documentIntelligence.structuredFacts.slice(0, 16).map(
                (f) =>
                  `- **${f.label}:** ${f.value}${f.periodLabel ? ` (${f.periodLabel})` : ""} — source: ${f.provenance.displayName}${f.provenance.sectionOrTable ? `, ${f.provenance.sectionOrTable}` : ""} [${f.provenance.extractionMethod}, ${f.provenance.confidence}]`,
              ),
            ].join("\n")
          : `> ${CHANAKYA_CREDIT_PROPOSAL_NO_EXTRACTION_NOTICE}`,
        ``,
        ctx.documentIntelligence.documentsRequiringOcr > 0
          ? `${ctx.documentIntelligence.documentsRequiringOcr} document(s) were classified as OCR-required and were not content-read.`
          : null,
      ]
        .filter((line) => line !== null)
        .join("\n"),
      ["documents", "edie_facts"],
    ),
    section(
      "property_security",
      [
        line("Property type (stated)", ctx.stated.statedPropertyType),
        line("Property value (stated)", ctx.stated.statedPropertyValue),
        line("Property location (stated)", ctx.stated.statedPropertyLocation),
        ``,
        `Valuation is not invented. Property document content extraction is not available in this phase.`,
      ].join("\n"),
      ["credit_workbench", "documents", "transaction"],
      hasPropertyContext,
    ),
    section(
      "credit_context",
      [
        `- On the basis of the available evidence, Opportunity identity and product/amount framing are available from Catalyst One.`,
        `- Credit Workbench stated financial fields: ${
          hasFinancialStated ? "partially available" : "largely incomplete"
        }.`,
        `- Documents on record: ${ctx.documents.length}; verification stamps: ${verifiedCount}.`,
        `- Calculated credit ratios (FOIR / DSCR / LTV / banking): **not available** — engine SSOT pending.`,
        `- CHANAKYA does not assert underwriting outcomes or approval decisions in this draft.`,
      ].join("\n"),
      ["transaction", "credit_workbench", "documents", "chanakya_inference"],
    ),
    section(
      "key_positives",
      strengths.map((s) => `- ${s}`).join("\n"),
      ["chanakya_inference", "transaction", "credit_workbench", "documents", "rm_note"],
    ),
    section(
      "key_concerns",
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
        `Detailed structure (tenure, pricing, security perfection, FOIR/LTV fit) requires lender program parameters plus financial-analysis SSOT — both are out of scope for this generation phase.`,
      ].join("\n"),
      ["transaction", "lender_product"],
    ),
    section(
      "recommendation",
      [
        `**Draft recommendation (advisory only):** Based on the information reviewed, the transaction may be progressed for lender consideration **subject to lender policy and verification**. This is not a credit decision.`,
        ``,
        `Next human-controlled steps:`,
        `1. Review this draft for accuracy against Catalyst One records.`,
        `2. Optionally strengthen the internal evidence base (see CHANAKYA internal recommendations — not part of this lender draft).`,
        `3. Re-run MAKE PROPOSAL after financial/EDIE capabilities are available for deeper analysis.`,
        `4. **Send to Lender** remains a separate explicit user action — CHANAKYA will not send automatically.`,
      ].join("\n"),
      ["chanakya_inference"],
    ),
  ];

  const included = sections.filter((s) => s.included);
  const fullText = included.map((s) => `## ${s.title}\n\n${s.body}`).join("\n\n");

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
    sections: included,
    fullText,
    evidence: ctx.evidence,
    gaps: ctx.gaps.filter((g) => !looksLikeUploadAsk(g)),
    generatedAt: new Date().toISOString(),
  };
}

export function composeChanakyaCreditProposalDraft(
  ctx: ChanakyaCreditProposalContextPack,
): ChanakyaCreditProposalDraft {
  if (!shouldUseLenderProposalIntelligence(ctx)) {
    return composeLegacyChanakyaCreditProposalDraft(ctx);
  }

  const intelligence = buildLenderProposalIntelligence(ctx);
  const sections: ChanakyaCreditProposalSection[] = intelligence.sections.map((s) =>
    section(s.id, s.body, s.evidenceSources, s.included),
  );

  const included = sections.filter((s) => s.included);
  const fullText = included.map((s) => `## ${s.title}\n\n${s.body}`).join("\n\n");

  const lenderGaps = intelligence.lenderLimitations.filter((g) => !looksLikeUploadAsk(g));

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
    sections: included,
    fullText,
    evidence: ctx.evidence,
    gaps: lenderGaps.length ? lenderGaps : [CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE],
    generatedAt: new Date().toISOString(),
  };
}

/** Pre-016 compose path — verify / comparison only. */
export { composeLegacyChanakyaCreditProposalDraft };
