/**
 * CF-CHANAKYA-015 — Proposal Intelligence & Readiness (foundation).
 * Completeness only — never verification of correctness.
 */

import {
  CP5_DEFAULT_PROPOSAL_CONFIG,
  CP5_PROPOSAL_BUTTON_LABEL,
  CP5_STATED_INFORMATION_DOMAINS,
} from "@/constants/chanakya-phase5-intelligence";
import type {
  ChanakyaProposalConfig,
  ChanakyaProposalDraft,
  ChanakyaProposalProductRule,
  ChanakyaProposalReadinessField,
  ChanakyaProposalReadinessReview,
  ChanakyaStatedInformationDomain,
} from "@/types/chanakya-phase5-intelligence";

let proposalConfigOverride: ChanakyaProposalConfig | null = null;

export function getChanakyaProposalConfig(): ChanakyaProposalConfig {
  return proposalConfigOverride ?? CP5_DEFAULT_PROPOSAL_CONFIG;
}

export function setChanakyaProposalConfig(config: ChanakyaProposalConfig): void {
  if (config.buttonLabel !== CP5_PROPOSAL_BUTTON_LABEL) {
    throw new Error(`Proposal button label must be "${CP5_PROPOSAL_BUTTON_LABEL}".`);
  }
  proposalConfigOverride = config;
}

export function resetChanakyaProposalConfig(): void {
  proposalConfigOverride = null;
}

export function getProposalButtonLabel(): typeof CP5_PROPOSAL_BUTTON_LABEL {
  return getChanakyaProposalConfig().buttonLabel;
}

export function findProposalProductRule(productName: string): ChanakyaProposalProductRule | undefined {
  const config = getChanakyaProposalConfig();
  return config.products.find(
    (p) => p.enabled && (p.productName === productName || p.productId === productName),
  );
}

export function isProposalIntelligenceEnabled(productName: string, loanAmount: number): boolean {
  const rule = findProposalProductRule(productName);
  if (!rule) return false;
  return loanAmount >= rule.minimumLoanAmount;
}

function domainLabel(domain: ChanakyaStatedInformationDomain): string {
  return CP5_STATED_INFORMATION_DOMAINS.find((d) => d.id === domain)?.label ?? domain;
}

export function buildProposalReadinessReview(input: {
  productName: string;
  loanAmount: number;
  loanFileId?: string;
  stated?: Partial<Record<ChanakyaStatedInformationDomain, string | number | null>>;
}): ChanakyaProposalReadinessReview {
  const stated = input.stated ?? {};
  const fields: ChanakyaProposalReadinessField[] = [
    {
      key: "loan_amount",
      domain: "stated_financial_information",
      label: "Stated Loan Amount",
      whyRequired: "Required so the proposal frames the ask accurately.",
      statedValue: input.loanAmount || stated.stated_financial_information,
      complete: input.loanAmount > 0,
    },
    {
      key: "income",
      domain: "stated_income_information",
      label: "Stated Income Information",
      whyRequired: "Income framing supports the credit narrative.",
      statedValue: stated.stated_income_information ?? null,
      complete: stated.stated_income_information != null && String(stated.stated_income_information).trim() !== "",
    },
    {
      key: "business",
      domain: "stated_business_information",
      label: "Stated Business Information",
      whyRequired: "Business context is required for commercial proposals.",
      statedValue: stated.stated_business_information ?? null,
      complete: stated.stated_business_information != null && String(stated.stated_business_information).trim() !== "",
    },
    {
      key: "property",
      domain: "stated_property_information",
      label: "Stated Property Information",
      whyRequired: "Property context is required for secured / project proposals.",
      statedValue: stated.stated_property_information ?? null,
      complete: stated.stated_property_information != null && String(stated.stated_property_information).trim() !== "",
    },
  ];

  const completeCount = fields.filter((f) => f.complete).length;
  const completenessPct = Math.round((completeCount / fields.length) * 100);
  const threshold = getChanakyaProposalConfig().readinessThresholdPct;
  const ready = completenessPct >= threshold && isProposalIntelligenceEnabled(input.productName, input.loanAmount);

  const missing = fields.filter((f) => !f.complete).map((f) => domainLabel(f.domain));
  const conversationalPrompt = ready
    ? `Proposal readiness is ${completenessPct}%. I have enough Stated Information to prepare a professional draft for ${input.productName}.`
    : `Before we generate a proposal for ${input.productName}, I still need: ${missing.join(", ")}. We measure completeness only — I will not verify correctness.`;

  return {
    loanFileId: input.loanFileId,
    productName: input.productName,
    loanAmount: input.loanAmount,
    fields,
    completenessPct,
    ready,
    conversationalPrompt,
  };
}

/**
 * Prepare structured context for ChatGPT proposal drafting.
 * Does not call ChatGPT — returns Catalyst One-owned context package.
 */
export function buildProposalDraftingContext(review: ChanakyaProposalReadinessReview): {
  ready: boolean;
  context: Record<string, string | number | boolean>;
  artifactsRequested: string[];
} {
  if (!review.ready) {
    return { ready: false, context: {}, artifactsRequested: [] };
  }
  const context: Record<string, string | number | boolean> = {
    productName: review.productName,
    loanAmount: review.loanAmount,
    completenessPct: review.completenessPct,
    outboundEmailOwner: "catalyst_one",
  };
  for (const field of review.fields) {
    if (field.statedValue != null) context[field.key] = String(field.statedValue);
  }
  return {
    ready: true,
    context,
    artifactsRequested: [
      "executive_summary",
      "credit_proposal",
      "business_narrative",
      "lender_ready_proposal",
    ],
  };
}

export function createEmptyProposalDraft(input: {
  productName: string;
  loanAmount: number;
}): ChanakyaProposalDraft {
  return {
    draftId: `prop:${crypto.randomUUID()}`,
    productName: input.productName,
    loanAmount: input.loanAmount,
    artifacts: {},
    status: "draft",
    emailOutboundOwner: "catalyst_one",
  };
}
