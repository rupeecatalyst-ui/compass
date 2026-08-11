/**
 * CO-SARATHI-UX-001 — Consultation confidence & natural conversation helpers.
 * Experience layer only — does not change Planner / Policy / FDI engines.
 */

export type SarathiUxPhase =
  | "welcome"
  | "understanding"
  | "summary_pending"
  | "confirmed"
  | "advising";

export type SarathiProductContextId =
  | "home_loan"
  | "balance_transfer"
  | "lap"
  | "business_loan"
  | "working_capital"
  | "personal_loan"
  | "general";

export const SARATHI_PRODUCT_TONE: Record<
  SarathiProductContextId,
  { label: string; toneHint: string }
> = {
  home_loan: { label: "Home Loan", toneHint: "Calm · guiding · reassuring" },
  balance_transfer: { label: "Balance Transfer", toneHint: "Savings-oriented" },
  lap: { label: "Loan Against Property", toneHint: "Business-focused" },
  business_loan: { label: "Business Loan", toneHint: "Growth-oriented" },
  working_capital: { label: "Working Capital", toneHint: "Growth-oriented" },
  personal_loan: { label: "Personal Loan", toneHint: "Supportive" },
  general: { label: "Loan guidance", toneHint: "Professional · warm" },
};

/** Soft acknowledgements — rotated; never marketing slogans. */
export const SARATHI_ACKNOWLEDGEMENTS = [
  "I'd be happy to help.",
  "Understood.",
  "Thank you.",
  "That helps.",
  "Got it.",
  "Noted.",
  "I hear you.",
  "Makes sense.",
] as const;

/** Phrases that must never repeat as customer-facing chat. */
export const SARATHI_FACING_BLOCKLIST = [
  "let's support your business growth",
  "i can explain lending concepts",
  "let's reduce your borrowing cost",
  "ask about loans or emi",
  "share outstanding details next",
  "lap uses property as security",
  "let's grow your business finance",
  "let's strengthen your cash flow",
] as const;

/** Summary / recommendation unlock threshold (UX). */
export const SARATHI_CONSULTATION_READY_THRESHOLD = 85;

export type SarathiConfidenceMilestone =
  | "product"
  | "purpose"
  | "funding"
  | "property_or_context"
  | "borrower"
  | "ready";

export const SARATHI_CONFIDENCE_WEIGHTS: Record<SarathiConfidenceMilestone, number> = {
  product: 20,
  purpose: 20,
  funding: 20,
  property_or_context: 15,
  borrower: 15,
  ready: 10,
};

export type SarathiSummaryFact = { label: string; value: string };

export type SarathiConsultationConfidence = {
  score: number;
  milestones: SarathiConfidenceMilestone[];
  readyForSummary: boolean;
};

const FACT_LABELS: Record<string, string> = {
  product_interest: "Loan Type",
  required_amount: "Amount",
  purpose: "Purpose",
  employment_or_income: "Employment",
  employment: "Employment",
  location: "Location",
  city: "Location",
  existing_lender: "Current Bank",
  existing_emi: "Current EMI",
  property_value: "Property Value",
  property_type: "Property Type",
  business_type: "Business",
};

const PURPOSE_KEYS = new Set(["purpose", "fund_use", "use_of_funds", "objective"]);
const FUNDING_KEYS = new Set([
  "required_amount",
  "amount",
  "funding",
  "loan_amount",
  "outstanding_loan",
]);
const PROPERTY_KEYS = new Set([
  "property_value",
  "property_type",
  "existing_lender",
  "collateral",
  "city",
  "location",
  "business_type",
]);
const BORROWER_KEYS = new Set([
  "employment",
  "employment_or_income",
  "income",
  "existing_emi",
  "borrower",
]);

export function detectSarathiProductContext(text: string): SarathiProductContextId {
  const t = text.toLowerCase();
  if (/balance\s*transfer|\bbt\b|reduce\s*(my\s*)?emi/.test(t)) return "balance_transfer";
  if (/loan\s*against\s*property|\blap\b/.test(t)) return "lap";
  if (/working\s*capital|cash\s*flow/.test(t)) return "working_capital";
  if (/business\s*loan|msme|working\s*needs/.test(t)) return "business_loan";
  if (/personal\s*loan/.test(t)) return "personal_loan";
  if (/home\s*loan|house|property\s*purchase|buy(ing)?\s*a?\s*home/.test(t)) {
    return "home_loan";
  }
  return "general";
}

/**
 * @deprecated Fixed product questions are no longer used in active consultation.
 * Kept for tests / docs illustrating product-first intent only.
 */
export function primaryAdaptiveQuestionForProduct(
  product: SarathiProductContextId,
): string | null {
  switch (product) {
    case "home_loan":
      return "What is the property's approximate value?";
    case "balance_transfer":
      return "Which bank is your current loan with?";
    case "lap":
      return "May I know what you intend to use the funds for?";
    case "business_loan":
      return "What type of business do you operate?";
    case "working_capital":
      return "What type of business do you operate?";
    case "personal_loan":
      return "What amount are you considering?";
    default:
      return null;
  }
}

function hasAnyKey(
  facts: Array<{ key: string; value: string }>,
  keys: Set<string>,
): boolean {
  return facts.some((f) => keys.has(f.key.toLowerCase()) && f.value.trim().length > 0);
}

/**
 * Derive Consultation Confidence from known facts + Planner coverage.
 * Does not mutate Planner — read-only projection for UX gates.
 */
export function deriveSarathiConsultationConfidence(input: {
  product: SarathiProductContextId;
  facts: Array<{ key: string; value: string }>;
  /** Open Planner missing slot ids (not already known) */
  openMissingSlotIds?: string[];
  userTurnCount: number;
  confidenceScoreHint?: number;
}): SarathiConsultationConfidence {
  const milestones: SarathiConfidenceMilestone[] = [];
  let score = 0;

  if (input.product !== "general") {
    milestones.push("product");
    score += SARATHI_CONFIDENCE_WEIGHTS.product;
  }

  if (hasAnyKey(input.facts, PURPOSE_KEYS)) {
    milestones.push("purpose");
    score += SARATHI_CONFIDENCE_WEIGHTS.purpose;
  }

  if (hasAnyKey(input.facts, FUNDING_KEYS)) {
    milestones.push("funding");
    score += SARATHI_CONFIDENCE_WEIGHTS.funding;
  }

  if (hasAnyKey(input.facts, PROPERTY_KEYS)) {
    milestones.push("property_or_context");
    score += SARATHI_CONFIDENCE_WEIGHTS.property_or_context;
  }

  if (hasAnyKey(input.facts, BORROWER_KEYS)) {
    milestones.push("borrower");
    score += SARATHI_CONFIDENCE_WEIGHTS.borrower;
  }

  const open = (input.openMissingSlotIds ?? []).filter(Boolean);
  const engineHint = input.confidenceScoreHint ?? 0;
  if (
    open.length === 0 &&
    milestones.includes("product") &&
    milestones.includes("funding") &&
    (milestones.includes("purpose") || milestones.includes("property_or_context")) &&
    input.userTurnCount >= 4
  ) {
    milestones.push("ready");
    score += SARATHI_CONFIDENCE_WEIGHTS.ready;
  } else if (engineHint >= 80 && milestones.length >= 4 && input.userTurnCount >= 4) {
    milestones.push("ready");
    score = Math.max(score, 90);
  }

  score = Math.min(100, Math.round(score));

  const readyForSummary =
    score >= SARATHI_CONSULTATION_READY_THRESHOLD &&
    input.userTurnCount >= 4 &&
    milestones.includes("product") &&
    milestones.includes("funding") &&
    (milestones.includes("purpose") ||
      milestones.includes("property_or_context") ||
      milestones.includes("borrower"));

  return { score, milestones, readyForSummary };
}

/** @deprecated Prefer deriveSarathiConsultationConfidence.readyForSummary */
export function isSarathiSummaryReady(input: {
  userTurnCount: number;
  factCount: number;
  confidenceScoreHint?: number;
  product: SarathiProductContextId;
  consultationConfidence?: number;
  openMissingSlotCount?: number;
}): boolean {
  if ((input.consultationConfidence ?? 0) > 0) {
    return (
      (input.consultationConfidence ?? 0) >= SARATHI_CONSULTATION_READY_THRESHOLD &&
      input.userTurnCount >= 4 &&
      input.factCount >= 3
    );
  }
  // Legacy path — intentionally strict to avoid early summary
  if (input.userTurnCount < 4) return false;
  if (input.product === "general") return false;
  if ((input.openMissingSlotCount ?? 99) > 1) return false;
  if (input.factCount >= 4 && (input.confidenceScoreHint ?? 0) >= 70) return true;
  return false;
}

export function mapConsultationFactsToSummary(
  facts: Array<{ key: string; value: string }>,
  product: SarathiProductContextId,
): SarathiSummaryFact[] {
  const rows: SarathiSummaryFact[] = [];
  const seen = new Set<string>();

  if (product !== "general") {
    rows.push({ label: "Loan Type", value: SARATHI_PRODUCT_TONE[product].label });
    seen.add("loan_type");
  }

  for (const f of facts) {
    const label = FACT_LABELS[f.key] ?? f.key.replace(/_/g, " ");
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    if (!f.value?.trim()) continue;
    seen.add(key);
    rows.push({ label, value: f.value.trim() });
  }

  return rows.slice(0, 8);
}

/**
 * Lightweight UX fact hints from customer wording — complements engine keyFacts.
 * Does not invent eligibility; only mirrors what the customer said.
 */
export function extractUxFactsFromUtterance(
  utterance: string,
  product: SarathiProductContextId,
): Array<{ key: string; value: string }> {
  const t = utterance.trim();
  if (!t) return [];
  const out: Array<{ key: string; value: string }> = [];
  const lower = t.toLowerCase();

  if (product !== "general") {
    out.push({ key: "product_interest", value: SARATHI_PRODUCT_TONE[product].label });
  }

  if (
    /business\s+expansion|expansion|working\s+capital|purchase|buy|renovate|education|wedding|medical|personal\s+use|funds\s+for/i.test(
      t,
    )
  ) {
    out.push({ key: "purpose", value: t.slice(0, 80) });
  }

  if (/residential|commercial/.test(lower)) {
    out.push({
      key: "property_type",
      value: /commercial/.test(lower) ? "Commercial" : "Residential",
    });
  }

  const amount =
    t.match(/(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(lakh|lakhs|lac|crore|cr)\b/i) ??
    t.match(/(?:₹|rs\.?\s*)(\d[\d,]{4,})/i);
  if (amount) {
    out.push({ key: "required_amount", value: amount[0]!.replace(/\s+/g, " ").trim() });
  }

  if (/salaried|self[-\s]?employed|business\s+owner/.test(lower)) {
    out.push({
      key: "employment",
      value: /self[-\s]?employed|business\s+owner/.test(lower)
        ? "Self-employed"
        : "Salaried",
    });
  }

  if (/\b(hdfc|icici|sbi|axis|kotak|bob|pnb|yes\s*bank)\b/i.test(t)) {
    const bank = t.match(/\b(hdfc|icici|sbi|axis|kotak|bob|pnb|yes\s*bank)\b/i);
    if (bank) out.push({ key: "existing_lender", value: bank[1]!.toUpperCase() });
  }

  const city = t.match(
    /\b(mumbai|delhi|bengaluru|bangalore|pune|hyderabad|chennai|kolkata|ahmedabad|jaipur)\b/i,
  );
  if (city) out.push({ key: "location", value: city[1]! });

  return out;
}

export function normaliseFacingLine(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export function isBlockedFacingPhrase(text: string): boolean {
  const n = normaliseFacingLine(text);
  return SARATHI_FACING_BLOCKLIST.some((b) => n.includes(b));
}

export function pickSarathiAcknowledgement(priorAssistantTexts: string[]): string {
  const used = new Set(
    priorAssistantTexts.map((t) => normaliseFacingLine(t.split(/[.!?]/)[0] ?? "")),
  );
  for (const ack of SARATHI_ACKNOWLEDGEMENTS) {
    if (!used.has(normaliseFacingLine(ack))) return ack;
  }
  return "Understood.";
}

/**
 * Rotate approved Tone Library soft openers (non-blocked) by product context.
 * Experience-layer only — does not mutate the Tone Library engine.
 */
export function pickSarathiToneLibraryOpener(
  product: SarathiProductContextId,
  priorAssistantTexts: string[],
): string | null {
  const poolByProduct: Record<SarathiProductContextId, string[]> = {
    home_loan: ["Buying a home matters.", "Let's explore your options."],
    balance_transfer: ["Let me check a few details."],
    lap: ["Let me check a few details."],
    business_loan: ["Let me check a few details."],
    working_capital: ["Let me check a few details."],
    personal_loan: ["Let's review personal loan options."],
    general: ["Let me check a few details."],
  };
  const shared = ["Here is a clear next step.", "Preparing your recommendation."];
  const pool = [...(poolByProduct[product] ?? []), ...shared].filter(
    (l) => !isBlockedFacingPhrase(l),
  );
  const used = new Set(priorAssistantTexts.map(normaliseFacingLine));
  for (const line of pool) {
    const n = normaliseFacingLine(line);
    if (![...used].some((u) => u.includes(n) || n.includes(u.slice(0, 24)))) {
      return line.replace(/\.$/, "");
    }
  }
  return null;
}
