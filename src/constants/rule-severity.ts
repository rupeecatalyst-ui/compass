import type { RuleSeverity } from "@/types/rule-library";

export const RULE_SEVERITY_LABELS: Record<RuleSeverity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  informational: "Informational",
};

export const RULE_SEVERITY_DEFINITIONS: Record<RuleSeverity, string> = {
  critical: "Business cannot continue — e.g. PAN missing, identity failed, KYC failed, mandatory compliance failed.",
  high: "Credit processing cannot continue — e.g. bank statements missing, FOIR exceeds lender limit.",
  medium: "Credit can continue but requires attention — e.g. employer verification pending, minor documentation pending.",
  low: "Non-blocking observations — e.g. occupation missing, secondary contact missing.",
  informational: "No action required — e.g. recommendation generated, profile refreshed.",
};

/** Coloured badge classes — Critical red, High orange, Medium amber, Low blue, Informational grey. */
export const RULE_SEVERITY_BADGE_CLASS: Record<RuleSeverity, string> = {
  critical:
    "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  high:
    "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  medium:
    "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  low:
    "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  informational:
    "border-border/60 bg-muted/40 text-muted-foreground",
};

export const RULE_SEVERITY_ORDER: RuleSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "informational",
];

/**
 * Reserved for future engines — NOT active in this sprint.
 * Critical: block workflow, cannot publish decision.
 * High: generate alerts, require approval.
 * Medium: create follow-up tasks.
 * Low: display reminders.
 * Informational: audit only.
 */
export const RULE_SEVERITY_FUTURE_BEHAVIOR: Record<RuleSeverity, string[]> = {
  critical: ["Block workflow", "Cannot publish decision"],
  high: ["Generate alerts", "Require approval"],
  medium: ["Create follow-up tasks"],
  low: ["Display reminders"],
  informational: ["Audit only"],
};

export function compareRuleSeverity(a: RuleSeverity, b: RuleSeverity): number {
  return RULE_SEVERITY_ORDER.indexOf(a) - RULE_SEVERITY_ORDER.indexOf(b);
}
