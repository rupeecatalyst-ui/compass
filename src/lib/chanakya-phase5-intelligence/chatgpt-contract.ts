/**
 * CF-CHANAKYA-015 — ChatGPT role guards (foundation).
 * ChatGPT is never the source of business truth.
 */

import { CP5_CHATGPT_CONTRACT } from "@/constants/chanakya-phase5-intelligence";
import type {
  ChatGptAllowedOperation,
  ChatGptForbiddenOperation,
  ChanakyaChatGptContract,
} from "@/types/chanakya-phase5-intelligence";

export function getChanakyaChatGptContract(): ChanakyaChatGptContract {
  return CP5_CHATGPT_CONTRACT;
}

export function isChatGptOperationForbidden(op: ChatGptForbiddenOperation | string): boolean {
  return (CP5_CHATGPT_CONTRACT.forbiddenOperations as readonly string[]).includes(op);
}

export function isChatGptOperationAllowed(op: ChatGptAllowedOperation | string): boolean {
  return (CP5_CHATGPT_CONTRACT.allowedOperations as readonly string[]).includes(op);
}

/**
 * Daytime guard — Phase 5 must not invoke ChatGPT during business operations.
 * Returns false always in foundation (no remote calls wired).
 */
export function shouldInvokeChatGptDuringBusinessHours(): false {
  return false;
}

export function assertChatGptMayNotMutateEnterprise(): void {
  // Documented no-op: callers must route mutations through Catalyst One only.
}
