/**
 * Document Completion Score helpers — presentation gates only.
 */

import {
  DOCUMENT_COMPLETION_WEIGHTS,
  getDocumentWeightConfig,
  type DocumentCompletionWeightConfig,
} from "@/constants/document-completion/weights";

export interface DocumentCompletionItemStatus {
  typeRef: string;
  label: string;
  weight: number;
  mandatory: boolean;
  critical: boolean;
  /** received | verified | uploaded count as complete for collection gates */
  complete: boolean;
}

export interface DocumentCompletionScore {
  overallPct: number;
  mandatoryPct: number;
  conditionalPct: number;
  criticalMissing: string[];
  uploadedCount: number;
  totalCount: number;
  canProgressToLifeOrLoan: boolean;
  /** Readiness signal only — never use as a hard navigation gate (Chanakya Operating Principles). */
  blockReasons: string[];
}

function pct(earned: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((earned / total) * 100);
}

export function resolveApplicableWeights(input: {
  documentTypeRefs: string[];
  employmentType?: string;
}): DocumentCompletionWeightConfig[] {
  const emp = (input.employmentType || "").toLowerCase().replace(/\s+/g, "_");
  const refs = [...new Set(input.documentTypeRefs)];
  const fromRules = refs
    .map((typeRef) => {
      const cfg = getDocumentWeightConfig(typeRef);
      if (cfg) return cfg;
      return {
        typeRef,
        label: typeRef.replace(/^doc:/, "").replace(/-/g, " "),
        weight: 8,
        mandatory: false,
        critical: false,
      } satisfies DocumentCompletionWeightConfig;
    })
    .filter((cfg) => {
      if (!cfg.hideForEmployment?.length) return true;
      return !cfg.hideForEmployment.some((h) => emp.includes(h.replace(/\s+/g, "_")));
    });

  if (fromRules.length > 0) return fromRules;
  return DOCUMENT_COMPLETION_WEIGHTS.filter((cfg) => {
    if (!cfg.hideForEmployment?.length) return true;
    return !cfg.hideForEmployment.some((h) => emp.includes(h.replace(/\s+/g, "_")));
  });
}

export function computeDocumentCompletionScore(input: {
  items: DocumentCompletionItemStatus[];
}): DocumentCompletionScore {
  const items = input.items;
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  const earnedWeight = items.filter((i) => i.complete).reduce((s, i) => s + i.weight, 0);

  const mandatory = items.filter((i) => i.mandatory);
  const conditional = items.filter((i) => !i.mandatory);
  const mandTotal = mandatory.reduce((s, i) => s + i.weight, 0);
  const mandEarned = mandatory.filter((i) => i.complete).reduce((s, i) => s + i.weight, 0);
  const condTotal = conditional.reduce((s, i) => s + i.weight, 0);
  const condEarned = conditional.filter((i) => i.complete).reduce((s, i) => s + i.weight, 0);

  const criticalMissing = items.filter((i) => i.critical && !i.complete).map((i) => i.label);
  const uploadedCount = items.filter((i) => i.complete).length;

  const blockReasons: string[] = [];
  if (uploadedCount < 1) blockReasons.push("At least one document must be uploaded or received.");
  if (criticalMissing.length > 0) {
    blockReasons.push(`Critical documents missing: ${criticalMissing.join(", ")}.`);
  }

  return {
    overallPct: pct(earnedWeight, totalWeight),
    mandatoryPct: pct(mandEarned, mandTotal),
    conditionalPct: pct(condEarned, condTotal),
    criticalMissing,
    uploadedCount,
    totalCount: items.length,
    canProgressToLifeOrLoan: blockReasons.length === 0,
    blockReasons,
  };
}
