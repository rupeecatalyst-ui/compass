/**
 * Context prioritisation — select relevant domains only (CO-AI-103).
 */

import {
  EAI_CONTEXT_PRIORITISATION_RULES,
} from "@/constants/enterprise-ai-platform/context-intelligence";
import type { EaiContextDomain } from "@/types/enterprise-ai-context-intelligence";

export function prioritiseEaiContextDomains(input: {
  requestHint?: string;
  forceDomains?: EaiContextDomain[];
}): { domains: EaiContextDomain[]; ruleIds: string[]; notes: string[] } {
  if (input.forceDomains && input.forceDomains.length > 0) {
    return {
      domains: [...new Set(input.forceDomains)],
      ruleIds: ["forced"],
      notes: ["Domains forced by caller override"],
    };
  }

  const hint = (input.requestHint ?? "").trim();
  if (!hint) {
    return {
      domains: ["conversation", "knowledge"],
      ruleIds: ["default_minimal"],
      notes: ["No hint — minimal conversation + knowledge context"],
    };
  }

  const matched = EAI_CONTEXT_PRIORITISATION_RULES.filter((r) => r.pattern.test(hint));
  if (matched.length === 0) {
    return {
      domains: ["conversation", "knowledge", "product"],
      ruleIds: ["fallback_general"],
      notes: ["No specific rule matched — general safe domains"],
    };
  }

  const include = new Set<EaiContextDomain>();
  const exclude = new Set<EaiContextDomain>();
  const ruleIds: string[] = [];
  const notes: string[] = [];

  for (const rule of matched) {
    ruleIds.push(rule.id);
    notes.push(rule.description);
    for (const d of rule.include) include.add(d);
    for (const d of rule.exclude ?? []) exclude.add(d);
  }

  for (const d of exclude) include.delete(d);

  // Always allow conversation memory when a hint exists
  include.add("conversation");

  return {
    domains: [...include],
    ruleIds,
    notes,
  };
}
