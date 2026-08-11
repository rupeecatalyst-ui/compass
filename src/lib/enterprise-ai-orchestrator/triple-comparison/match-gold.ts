/**
 * CO-AI-G2-W4 — Match customer utterance to nearest Gold Standard turn pair.
 * Benchmark library only — not runtime dialogue.
 */

import { EAO_GOLD_STANDARD_LIBRARY } from "@/constants/enterprise-ai-orchestrator/gold-standard-library";
import type { EaoBenchmarkProductPath } from "@/constants/enterprise-ai-orchestrator/consultant-benchmark";

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9\u0900-\u097f]+/i)
      .filter((t) => t.length > 2),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export type EaoGoldMatch = {
  conversationId: string;
  productId: EaoBenchmarkProductPath;
  productLabel: string;
  title: string;
  customerGoldText: string;
  consultantGoldText: string;
  matchScore: number;
};

/**
 * Find best gold customer→consultant pair for this utterance.
 */
export function matchEaoGoldStandardTurn(input: {
  customerUtterance: string;
  productPath?: EaoBenchmarkProductPath;
}): EaoGoldMatch | null {
  const q = tokens(input.customerUtterance);
  let best: EaoGoldMatch | null = null;

  for (const product of EAO_GOLD_STANDARD_LIBRARY.products) {
    if (
      input.productPath &&
      input.productPath !== "general" &&
      product.productId !== input.productPath
    ) {
      continue;
    }
    for (const conversation of product.typicalConversations) {
      let pendingCustomer: string | null = null;
      for (const turn of conversation.turns) {
        if (turn.speaker === "customer") {
          pendingCustomer = turn.text;
          continue;
        }
        if (turn.speaker === "consultant" && pendingCustomer) {
          const score = jaccard(q, tokens(pendingCustomer));
          // Slight boost when product path forced-match
          const adjusted =
            input.productPath && input.productPath === product.productId
              ? Math.min(1, score + 0.05)
              : score;
          if (!best || adjusted > best.matchScore) {
            best = {
              conversationId: conversation.conversationId,
              productId: product.productId,
              productLabel: product.productLabel,
              title: conversation.title,
              customerGoldText: pendingCustomer,
              consultantGoldText: turn.text,
              matchScore: Math.round(adjusted * 1000) / 1000,
            };
          }
          pendingCustomer = null;
        }
      }
    }
  }

  // If product filter yielded nothing, retry without filter
  if (!best && input.productPath && input.productPath !== "general") {
    return matchEaoGoldStandardTurn({ customerUtterance: input.customerUtterance });
  }

  return best && best.matchScore >= 0.08 ? best : best;
}
