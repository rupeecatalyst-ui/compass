import type { SarathiConsultationMemory } from "@/types/enterprise-ai-conversation-experience";
import {
  detectSarathiProductContext,
  extractUxFactsFromUtterance,
  type SarathiProductContextId,
} from "./ux-flow";

export type { SarathiConsultationMemory };

export function emptySarathiConsultationMemory(): SarathiConsultationMemory {
  return {
    customerGoals: [],
    product: "general",
    askedKeys: [],
    knownKeys: [],
    turnCount: 0,
  };
}

const KEY_LABEL: Record<string, keyof SarathiConsultationMemory | "skip"> = {
  product_interest: "loanType",
  purpose: "purpose",
  required_amount: "fundingAmount",
  employment: "employment",
  employment_or_income: "employment",
  business_type: "businessType",
  property_type: "propertyType",
  property_value: "skip",
  location: "location",
  city: "location",
  existing_lender: "existingLender",
  existing_emi: "existingEmi",
  outstanding_loan: "existingLoan",
};

export function mergeSarathiConsultationMemory(
  prior: SarathiConsultationMemory | undefined,
  input: {
    utterance: string;
    keyFacts?: Array<{ key: string; value: string }>;
    lastAssistantQuestion?: string | null;
    assistantAskedKey?: string | null;
  },
): SarathiConsultationMemory {
  const mem = { ...(prior ?? emptySarathiConsultationMemory()) };
  mem.turnCount = (mem.turnCount ?? 0) + 1;
  mem.lastCustomerUtterance = input.utterance;

  const product = detectSarathiProductContext(
    [mem.loanType ?? "", mem.customerGoals.join(" "), input.utterance].join(" "),
  );
  if (product !== "general") {
    mem.product = product;
    const label =
      product === "home_loan"
        ? "Home Loan"
        : product === "balance_transfer"
          ? "Balance Transfer"
          : product === "lap"
            ? "Loan Against Property"
            : product === "business_loan"
              ? "Business Loan"
              : product === "working_capital"
                ? "Working Capital"
                : product === "personal_loan"
                  ? "Personal Loan"
                  : undefined;
    if (label) mem.loanType = mem.loanType ?? label;
  }

  if (/buy|purchase|first\s+home|flat|house/i.test(input.utterance) && !mem.purpose) {
    mem.purpose = mem.purpose ?? "Purchase";
  }
  if (/expans|working\s+capital|renovat|medical|consolidat|top[\s-]?up/i.test(input.utterance)) {
    mem.purpose = mem.purpose ?? input.utterance.slice(0, 80);
  }

  const uxFacts = extractUxFactsFromUtterance(input.utterance, mem.product);
  for (const f of [...(input.keyFacts ?? []), ...uxFacts]) {
    const mapped = KEY_LABEL[f.key];
    if (!mapped || mapped === "skip") continue;
    if (f.value?.trim()) {
      (mem as unknown as Record<string, unknown>)[mapped] = f.value.trim();
      if (!mem.knownKeys.includes(f.key)) mem.knownKeys.push(f.key);
    }
  }

  if (/proprietorship|partnership|private\s+limited|pvt\.?\s*ltd/i.test(input.utterance)) {
    mem.businessType = input.utterance.match(
      /proprietorship|partnership|private\s+limited|pvt\.?\s*ltd/i,
    )?.[0];
    if (!mem.knownKeys.includes("business_type")) mem.knownKeys.push("business_type");
  }

  if (input.utterance.trim().length > 8 && !mem.customerGoals.includes(input.utterance.slice(0, 120))) {
    mem.customerGoals = [...mem.customerGoals, input.utterance.slice(0, 120)].slice(-8);
  }

  if (input.lastAssistantQuestion) {
    mem.lastAssistantQuestion = input.lastAssistantQuestion;
  }
  if (input.assistantAskedKey && !mem.askedKeys.includes(input.assistantAskedKey)) {
    mem.askedKeys = [...mem.askedKeys, input.assistantAskedKey];
  }

  return mem;
}

function has(mem: SarathiConsultationMemory, k: string): boolean {
  if (mem.knownKeys.includes(k)) return true;
  const mapped = KEY_LABEL[k];
  if (!mapped || mapped === "skip") return false;
  return Boolean((mem as unknown as Record<string, unknown>)[mapped as string]);
}

export function missingConsultationSlots(
  mem: SarathiConsultationMemory,
): Array<{ key: string; label: string; question: string }> {
  const missing: Array<{ key: string; label: string; question: string }> = [];

  if (mem.product === "general" && !mem.loanType) {
    missing.push({
      key: "product_interest",
      label: "Loan type",
      question: "Which type of loan are you exploring — home, business, LAP, or personal?",
    });
  }
  if (!mem.purpose && !has(mem, "purpose")) {
    missing.push({
      key: "purpose",
      label: "Purpose",
      question:
        mem.product === "lap" || mem.product === "business_loan"
          ? "What do you intend to use the funds for?"
          : mem.product === "balance_transfer"
            ? "Are you mainly looking to reduce EMI or interest cost?"
            : "What is the main purpose of this loan?",
    });
  }
  if (!mem.fundingAmount && !has(mem, "required_amount")) {
    missing.push({
      key: "required_amount",
      label: "Amount",
      question: "Approximately how much funding are you looking for?",
    });
  }
  if (
    (mem.product === "home_loan" || mem.product === "lap") &&
    !mem.propertyType &&
    !has(mem, "property_type")
  ) {
    missing.push({
      key: "property_type",
      label: "Property",
      question:
        mem.product === "lap"
          ? "Is the property residential or commercial?"
          : "Is this a ready property, or are you still shortlisting?",
    });
  }
  if (mem.product === "balance_transfer" && !mem.existingLender && !has(mem, "existing_lender")) {
    missing.push({
      key: "existing_lender",
      label: "Current bank",
      question: "Which bank is your current loan with?",
    });
  }
  if (
    (mem.product === "business_loan" || mem.product === "working_capital" || mem.product === "lap") &&
    !mem.businessType &&
    !mem.employment &&
    !has(mem, "business_type")
  ) {
    missing.push({
      key: "business_type",
      label: "Business",
      question: "Is your business a proprietorship, partnership, or private limited?",
    });
  }
  if (!mem.employment && !has(mem, "employment") && mem.product === "home_loan") {
    missing.push({
      key: "employment",
      label: "Employment",
      question: "Are you salaried or self-employed?",
    });
  }
  if (!mem.location && !has(mem, "location") && mem.turnCount >= 2) {
    missing.push({
      key: "location",
      label: "Location",
      question: "Which city is this for?",
    });
  }

  return missing.filter((m) => !mem.askedKeys.includes(m.key) || !has(mem, m.key));
}

export function summariseKnownFacts(mem: SarathiConsultationMemory): string {
  const parts: string[] = [];
  if (mem.loanType) parts.push(mem.loanType);
  if (mem.purpose) parts.push(`purpose: ${mem.purpose}`);
  if (mem.fundingAmount) parts.push(`amount: ${mem.fundingAmount}`);
  if (mem.employment) parts.push(mem.employment);
  if (mem.businessType) parts.push(mem.businessType);
  if (mem.propertyType) parts.push(`${mem.propertyType} property`);
  if (mem.location) parts.push(mem.location);
  if (mem.existingLender) parts.push(`current bank: ${mem.existingLender}`);
  return parts.join(" · ");
}
