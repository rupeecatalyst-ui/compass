/**
 * CO-CHANAKYA-037 — Browser client for employee Ask CHANAKYA conversation.
 */

import { authenticatedJsonFetch } from "@/lib/api-client";
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
    const message =
      json.error?.message ||
      `Ask CHANAKYA request failed (${res.status}).`;
    throw Object.assign(new Error(message), {
      code: json.error?.code || `HTTP_${res.status}`,
      statusCode: res.status,
    });
  }
  return json.data;
}
