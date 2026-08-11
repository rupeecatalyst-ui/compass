/**
 * CO-AI-G2-W3 — Project gold-standard consultant turns into benchmark inputs.
 * Offline evaluation only.
 */

import { EAO_GOLD_STANDARD_LIBRARY } from "@/constants/enterprise-ai-orchestrator/gold-standard-library";
import type { EaoBenchmarkConversationInput } from "@/types/enterprise-ai-orchestrator/benchmark";
import type { EaoGoldStandardConversation } from "@/types/enterprise-ai-orchestrator/gold-standard";

function conversationToBenchmarkInput(
  productId: EaoBenchmarkConversationInput["productPath"],
  productLabel: string,
  conversation: EaoGoldStandardConversation,
): EaoBenchmarkConversationInput | null {
  const turns: EaoBenchmarkConversationInput["turns"] = [];
  let pendingCustomer: string | null = null;
  let turnIndex = 0;

  for (const t of conversation.turns) {
    if (t.speaker === "customer") {
      pendingCustomer = t.text;
      continue;
    }
    if (t.speaker === "consultant" && pendingCustomer) {
      turns.push({
        turnIndex,
        customerUtterance: pendingCustomer,
        assistantFacingText: t.text,
      });
      turnIndex += 1;
      pendingCustomer = null;
    }
  }

  if (turns.length === 0) return null;

  return {
    conversationId: conversation.conversationId,
    productPath: productId,
    scenarioLabel: `${productLabel} — ${conversation.title}`,
    source: "fixture",
    turns,
  };
}

/** All gold-standard dialogues as benchmark conversation inputs. */
export function listEaoGoldStandardBenchmarkConversations(): EaoBenchmarkConversationInput[] {
  const out: EaoBenchmarkConversationInput[] = [];
  for (const product of EAO_GOLD_STANDARD_LIBRARY.products) {
    for (const conversation of product.typicalConversations) {
      const mapped = conversationToBenchmarkInput(
        product.productId,
        product.productLabel,
        conversation,
      );
      if (mapped) out.push(mapped);
    }
  }
  return out;
}
