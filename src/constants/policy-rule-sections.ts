import type { PolicyRuleSectionId } from "@/types/credit-risk-engine";

export const POLICY_RULE_SECTION_ORDER: PolicyRuleSectionId[] = [
  "financial",
  "property",
  "banking",
  "bureau",
  "customer",
  "geography",
  "compliance",
  "custom",
];

export const POLICY_RULE_SECTION_LABELS: Record<PolicyRuleSectionId, string> = {
  financial: "Financial Rules",
  property: "Property Rules",
  banking: "Banking Rules",
  bureau: "Bureau Rules",
  customer: "Customer Rules",
  geography: "Geography Rules",
  compliance: "Compliance Rules",
  custom: "Custom Rules",
};

/** Map rule library categoryId to default policy section. */
export function categoryToPolicySection(categoryId: string): PolicyRuleSectionId {
  const map: Record<string, PolicyRuleSectionId> = {
    financial: "financial",
    property: "property",
    banking: "banking",
    bureau: "bureau",
    customer: "customer",
    geography: "geography",
    compliance: "compliance",
  };
  return map[categoryId] ?? "custom";
}

/** Recommended category pairs — warn when one is present without the other. */
export const POLICY_RULE_CATEGORY_PAIRS: Array<{ a: string; b: string; label: string }> = [
  { a: "LTV", b: "FOIR", label: "LTV without FOIR" },
  { a: "FOIR", b: "LTV", label: "FOIR without LTV" },
];
