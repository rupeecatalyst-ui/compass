/**
 * CO-CHANAKYA-037 / CO-C1-CHANAKYA-CONVERSATIONAL-INTELLIGENCE-009
 * Browser client for employee Ask CHANAKYA conversation.
 */

import { authenticatedJsonFetch } from "@/lib/api-client";
import { CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE } from "@/constants/chanakya-conversation-intelligence";
import {
  CHANAKYA_CONVERSATION_PROPOSAL_DRAFT_PATH,
  CHANAKYA_CONVERSATION_SESSIONS_PATH,
  CHANAKYA_CONVERSATION_STREAM_PATH,
} from "@/constants/chanakya-conversational-intelligence";
import type {
  ChanakyaInappTurnRequest,
  ChanakyaInappTurnResult,
} from "@/types/chanakya-inapp-conversation";
import type {
  ChanakyaConversationSessionSummary,
  ChanakyaConversationStreamEvent,
} from "@/types/chanakya-conversational-intelligence";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: { message?: string; code?: string };
};

function throwConversationError(res: Response, json: ApiEnvelope<unknown>): never {
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

export async function postChanakyaInappConversationTurn(
  body: ChanakyaInappTurnRequest,
): Promise<ChanakyaInappTurnResult> {
  const res = await authenticatedJsonFetch("/api/chanakya/conversation", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<ChanakyaInappTurnResult>;
  if (!res.ok || !json.data) throwConversationError(res, json);
  return json.data;
}

export async function createChanakyaConversationSession(): Promise<{
  sessionId: string;
  title: string;
}> {
  const res = await authenticatedJsonFetch(CHANAKYA_CONVERSATION_SESSIONS_PATH, {
    method: "POST",
    body: JSON.stringify({}),
  });
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<{
    sessionId: string;
    title: string;
  }>;
  if (!res.ok || !json.data) throwConversationError(res, json);
  return json.data;
}

export async function listChanakyaConversationSessions(
  query?: string,
): Promise<{ sessions: ChanakyaConversationSessionSummary[]; retentionNotice: string }> {
  const qs = query?.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
  const res = await authenticatedJsonFetch(`${CHANAKYA_CONVERSATION_SESSIONS_PATH}${qs}`);
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<{
    sessions: ChanakyaConversationSessionSummary[];
    retentionNotice: string;
  }>;
  if (!res.ok || !json.data) throwConversationError(res, json);
  return json.data;
}

export async function loadChanakyaConversationSession(sessionId: string): Promise<{
  sessionId: string;
  title: string;
  messages: ChanakyaInappTurnResult["messages"];
  activeEntity: ChanakyaInappTurnResult["activeEntity"];
}> {
  const res = await authenticatedJsonFetch(`${CHANAKYA_CONVERSATION_SESSIONS_PATH}/${sessionId}`);
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<{
    sessionId: string;
    title: string;
    messages: ChanakyaInappTurnResult["messages"];
    activeEntity: ChanakyaInappTurnResult["activeEntity"];
  }>;
  if (!res.ok || !json.data) throwConversationError(res, json);
  return json.data;
}

export async function deleteChanakyaConversationSession(sessionId: string): Promise<void> {
  const res = await authenticatedJsonFetch(`${CHANAKYA_CONVERSATION_SESSIONS_PATH}/${sessionId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as ApiEnvelope<unknown>;
    throwConversationError(res, json);
  }
}

export async function saveChanakyaConversationProposalDraft(input: {
  draftId: string;
  confirmed: boolean;
  sessionId?: string | null;
}): Promise<{ saved: boolean; sent: boolean }> {
  const res = await authenticatedJsonFetch(CHANAKYA_CONVERSATION_PROPOSAL_DRAFT_PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<{
    saved: boolean;
    sent: boolean;
  }>;
  if (!res.ok || !json.data) throwConversationError(res, json);
  return json.data;
}

export async function postChanakyaMessageFeedback(input: {
  sessionId: string;
  messageId: string;
  feedback: "up" | "down" | null;
}): Promise<void> {
  const res = await authenticatedJsonFetch(
    `${CHANAKYA_CONVERSATION_SESSIONS_PATH}/${input.sessionId}`,
    {
      method: "POST",
      body: JSON.stringify({ messageId: input.messageId, feedback: input.feedback }),
    },
  );
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as ApiEnvelope<unknown>;
    throwConversationError(res, json);
  }
}

export async function streamChanakyaInappConversationTurn(
  body: ChanakyaInappTurnRequest,
  handlers: {
    signal?: AbortSignal;
    onSession?: (sessionId: string) => void;
    onDelta?: (text: string) => void;
    onProposal?: (event: Extract<ChanakyaConversationStreamEvent, { type: "proposal" }>) => void;
    onDone?: (result: ChanakyaInappTurnResult) => void;
  },
): Promise<void> {
  const res = await authenticatedJsonFetch(CHANAKYA_CONVERSATION_STREAM_PATH, {
    method: "POST",
    body: JSON.stringify(body),
    signal: handlers.signal,
  });
  if (!res.ok || !res.body) {
    const json = (await res.json().catch(() => ({}))) as ApiEnvelope<unknown>;
    throwConversationError(res, json);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part
        .split("\n")
        .map((row) => row.trim())
        .find((row) => row.startsWith("data:"));
      if (!line) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      try {
        const event = JSON.parse(payload) as ChanakyaConversationStreamEvent | {
          type: "error";
          message: string;
        };
        if (event.type === "session") handlers.onSession?.(event.sessionId);
        else if (event.type === "delta") handlers.onDelta?.(event.text);
        else if (event.type === "proposal") handlers.onProposal?.(event);
        else if (event.type === "done") handlers.onDone?.(event.result);
        else if (event.type === "error") {
          throw Object.assign(new Error(event.message || CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE), {
            statusCode: 503,
          });
        }
      } catch (err) {
        if (err && typeof err === "object" && "statusCode" in err) throw err;
      }
    }
  }
}

