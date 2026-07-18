/**
 * Evaluate Document Completion Score for a loan file via EDIE certified rules.
 */

import {
  listEdieCriticalPending,
  resolveEdieChecklistForLoanFile,
  seedEdieCertifiedRulesIfNeeded,
} from "@/lib/edie-certified";
import {
  computeDocumentCompletionScore,
  type DocumentCompletionScore,
} from "@/lib/document-completion/score";
import type { LoanFile } from "@/types/catalyst-one";
import { EDIE_ADDRESS_PROOF_GROUP } from "@/constants/edie-certified/document-catalog";

export function evaluateDocumentCompletionForLoanFile(
  file: LoanFile | null | undefined,
): DocumentCompletionScore {
  seedEdieCertifiedRulesIfNeeded();

  if (!file) {
    return computeDocumentCompletionScore({ items: [] });
  }

  const checklist = resolveEdieChecklistForLoanFile(file);
  const scoringItems = checklist.items.filter(
    (i) => i.choiceGroupId !== EDIE_ADDRESS_PROOF_GROUP || !i.optional,
  );

  const items = scoringItems.map((i) => ({
    typeRef: i.typeRef,
    label: i.label,
    weight: i.weight,
    mandatory: i.mandatory,
    critical: i.critical,
    complete: i.complete,
  }));

  const score = computeDocumentCompletionScore({ items });
  const critical = listEdieCriticalPending(file);
  if (critical.length > 0) {
    score.criticalMissing = critical.map((c) => c.label);
    if (!score.blockReasons.some((r) => r.includes("Critical"))) {
      score.blockReasons.push(
        `Before this file proceeds further, the following critical documents are pending: ${critical.map((c) => c.label).join(", ")}.`,
      );
    }
    score.canProgressToLifeOrLoan = false;
  }
  return score;
}
