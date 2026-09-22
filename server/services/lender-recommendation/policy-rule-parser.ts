export type CanonicalCibilRangeRule = {
  type: "cibil_range";
  minimum: number | null;
  maximum: number | null;
};

export type ParsedCanonicalPolicyRules = {
  cibilRanges: CanonicalCibilRangeRule[];
};

export class UnsupportedEligibilityPolicyRuleError extends Error {
  constructor(ruleType: string) {
    super(`Unsupported eligibility-affecting policy rule: ${ruleType}`);
    this.name = "UnsupportedEligibilityPolicyRuleError";
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nullableFiniteNumber(value: unknown, field: string): number | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Policy rule ${field} must be a finite number or null.`);
  }
  return value;
}

/**
 * Stage 1 allowlist parser. Empty rule documents are valid. Any declared rule
 * outside the explicit allowlist fails closed instead of being ignored.
 */
export function parseCanonicalPolicyRules(value: unknown): ParsedCanonicalPolicyRules {
  const root = record(value);
  if (value == null) return { cibilRanges: [] };
  if (!root) throw new UnsupportedEligibilityPolicyRuleError("invalid_document");
  if (Object.keys(root).length === 0) return { cibilRanges: [] };
  if (Object.keys(root).some(key => key !== "rules")) throw new UnsupportedEligibilityPolicyRuleError("unknown_document_field");
  if (!Array.isArray(root.rules)) {
    throw new UnsupportedEligibilityPolicyRuleError("unstructured_policy_document");
  }

  const cibilRanges: CanonicalCibilRangeRule[] = [];
  for (const item of root.rules) {
    const rule = record(item);
    const type = typeof rule?.type === "string" ? rule.type : "missing_type";
    if (!rule || type !== "cibil_range") throw new UnsupportedEligibilityPolicyRuleError(type);
    if (Object.keys(rule).some(key => !["type", "minimum", "maximum"].includes(key))) {
      throw new UnsupportedEligibilityPolicyRuleError("unknown_rule_field");
    }
    const minimum = nullableFiniteNumber(rule.minimum, "minimum");
    const maximum = nullableFiniteNumber(rule.maximum, "maximum");
    if ([minimum, maximum].some(value => value != null && (!Number.isInteger(value) || value < 0))) {
      throw new Error("POLICY_CIBIL_RANGE_INVALID");
    }
    if (minimum != null && maximum != null && minimum > maximum) {
      throw new Error("Policy CIBIL range minimum cannot exceed maximum.");
    }
    cibilRanges.push({ type, minimum, maximum });
  }
  return { cibilRanges };
}
