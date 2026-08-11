/**
 * Context budget architecture — size limits, priority, truncation (CO-AI-103).
 * Approximate character budgeting only — no tokenizer / token counting.
 */

import { EAI_DEFAULT_CONTEXT_BUDGET_POLICY } from "@/constants/enterprise-ai-platform/context-intelligence";
import type {
  EaiContextBudgetPolicy,
  EaiContextDomain,
  EaiContextDomainSection,
} from "@/types/enterprise-ai-context-intelligence";

export function resolveEaiContextBudgetPolicy(
  overrides?: Partial<EaiContextBudgetPolicy>,
): EaiContextBudgetPolicy {
  return {
    ...EAI_DEFAULT_CONTEXT_BUDGET_POLICY,
    ...overrides,
    priorityOrder:
      overrides?.priorityOrder ?? EAI_DEFAULT_CONTEXT_BUDGET_POLICY.priorityOrder,
  };
}

export function approximateEaiSectionChars(section: EaiContextDomainSection): number {
  const factsChars = section.facts.reduce(
    (n, f) => n + f.key.length + f.value.length,
    0,
  );
  const refsChars = section.refs.reduce(
    (n, r) => n + r.registry.length + r.entityId.length + (r.label?.length ?? 0),
    0,
  );
  return factsChars + refsChars + (section.summary?.length ?? 0) + 32;
}

export function approximateEaiPackageChars(sections: EaiContextDomainSection[]): number {
  return sections.filter((s) => s.included).reduce((n, s) => n + approximateEaiSectionChars(s), 0);
}

/**
 * Apply budget policy: summary-replace then truncate lowest-priority domains.
 */
export function applyEaiContextBudget(
  sections: EaiContextDomainSection[],
  policy: EaiContextBudgetPolicy,
): {
  sections: EaiContextDomainSection[];
  truncated: boolean;
  summaryReplacedDomains: EaiContextDomain[];
  omittedDomains: EaiContextDomain[];
  approximateChars: number;
} {
  const next = sections.map((s) => ({ ...s, facts: [...s.facts], refs: [...s.refs] }));
  const summaryReplacedDomains: EaiContextDomain[] = [];
  const omittedDomains: EaiContextDomain[] = [];
  let truncated = false;

  const priorityIndex = (domain: EaiContextDomain) => {
    const idx = policy.priorityOrder.indexOf(domain);
    return idx === -1 ? policy.priorityOrder.length + 1 : idx;
  };

  const sortByPriorityAsc = (list: EaiContextDomainSection[]) =>
    [...list].sort((a, b) => priorityIndex(a.domain) - priorityIndex(b.domain));

  // Summary replacement for lowest-priority included sections while over budget
  if (policy.enableSummaryReplacement) {
    let chars = approximateEaiPackageChars(next);
    const candidates = sortByPriorityAsc(next.filter((s) => s.included)).reverse();
    for (const section of candidates) {
      if (chars <= policy.maxApproximateChars) break;
      if (!section.summary && section.facts.length === 0) continue;
      const idx = next.findIndex((s) => s.domain === section.domain);
      if (idx < 0) continue;
      const summary =
        section.summary ??
        section.facts
          .slice(0, 3)
          .map((f) => `${f.key}=${f.value}`)
          .join("; ")
          .slice(0, 400);
      next[idx] = {
        ...next[idx],
        facts: [],
        refs: next[idx].refs.slice(0, 2),
        summary,
      };
      summaryReplacedDomains.push(section.domain);
      chars = approximateEaiPackageChars(next);
      truncated = true;
    }
  }

  // Truncation — omit lowest priority
  if (policy.enableTruncation) {
    let chars = approximateEaiPackageChars(next);
    const candidates = sortByPriorityAsc(next.filter((s) => s.included)).reverse();
    for (const section of candidates) {
      if (chars <= policy.maxApproximateChars) break;
      const idx = next.findIndex((s) => s.domain === section.domain);
      if (idx < 0) continue;
      next[idx] = {
        ...next[idx],
        included: false,
        facts: [],
        refs: [],
        summary: undefined,
        omitReason: "Omitted by context budget truncation",
      };
      omittedDomains.push(section.domain);
      chars = approximateEaiPackageChars(next);
      truncated = true;
    }
  }

  return {
    sections: next,
    truncated,
    summaryReplacedDomains,
    omittedDomains,
    approximateChars: approximateEaiPackageChars(next),
  };
}
