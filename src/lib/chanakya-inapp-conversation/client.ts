/**
 * CO-CHANAKYA-037 — Browser client for employee Ask CHANAKYA conversation.
 */

import { authenticatedJsonFetch } from "@/lib/api-client";
import { CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE } from "@/constants/chanakya-conversation-intelligence";
import type {
  ChanakyaInappTurnRequest,
  ChanakyaInappTurnResult,
} from "@/types/chanakya-inapp-conversation";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: { message?: string; code?: string };
};

export async function postChanakyaInappConversationTurn(
  body: ChanakyaInappTurnRequest,
): Promise<ChanakyaInappTurnResult> {
  const res = await authenticatedJsonFetch("/api/chanakya/conversation", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<ChanakyaInappTurnResult>;
  if (!res.ok || !json.data) {
    const status = res.status;
    const message =
      status === 401
        ? "Please sign in to Catalyst One to ask CHANAKYA."
        : status === 403
          ? "You do not have access to that CHANAKYA view."
          : status === 400
            ? json.error?.message || "Please ask a question."
            : CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE;
    throw Object.assign(new Error(message), {
      code: json.error?.code || `HTTP_${status}`,
      statusCode: status,
    });
  }
  return json.data;
}
