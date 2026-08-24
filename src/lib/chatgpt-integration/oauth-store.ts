/**
 * CO-CHATGPT-OAUTH-001 — In-memory OAuth authorization code + pending request store.
 */
import { randomBytes } from "node:crypto";
import {
  CHATGPT_OAUTH_CODE_TTL_MS,
  CHATGPT_OAUTH_REQUEST_TTL_MS,
} from "@/constants/chatgpt-integration-oauth";
import type {
  ChatGptOAuthAuthorizationCode,
  ChatGptOAuthPendingRequest,
} from "@/types/chatgpt-integration-oauth";

const pendingRequests = new Map<string, ChatGptOAuthPendingRequest>();
const authorizationCodes = new Map<string, ChatGptOAuthAuthorizationCode>();

function purgeExpired(): void {
  const now = Date.now();
  for (const [id, req] of pendingRequests) {
    if (req.expiresAt <= now) pendingRequests.delete(id);
  }
  for (const [code, entry] of authorizationCodes) {
    if (entry.expiresAt <= now || entry.used) authorizationCodes.delete(code);
  }
}

function randomId(prefix: string): string {
  return `${prefix}_${randomBytes(16).toString("base64url")}`;
}

export function createOAuthPendingRequest(
  input: Omit<
    ChatGptOAuthPendingRequest,
    "requestId" | "createdAt" | "expiresAt" | "codeChallengeMethod"
  >,
): ChatGptOAuthPendingRequest {
  purgeExpired();
  const now = Date.now();
  const request: ChatGptOAuthPendingRequest = {
    ...input,
    requestId: randomId("cgo_req"),
    codeChallengeMethod: "S256",
    createdAt: now,
    expiresAt: now + CHATGPT_OAUTH_REQUEST_TTL_MS,
  };
  pendingRequests.set(request.requestId, request);
  return request;
}

export function consumeOAuthPendingRequest(requestId: string): ChatGptOAuthPendingRequest | null {
  purgeExpired();
  const entry = pendingRequests.get(requestId);
  if (!entry || entry.expiresAt <= Date.now()) {
    pendingRequests.delete(requestId);
    return null;
  }
  pendingRequests.delete(requestId);
  return entry;
}

export function peekOAuthPendingRequest(requestId: string): ChatGptOAuthPendingRequest | null {
  purgeExpired();
  const entry = pendingRequests.get(requestId);
  if (!entry || entry.expiresAt <= Date.now()) {
    pendingRequests.delete(requestId);
    return null;
  }
  return entry;
}

export function issueAuthorizationCode(
  input: Omit<ChatGptOAuthAuthorizationCode, "code" | "expiresAt" | "used">,
): ChatGptOAuthAuthorizationCode {
  purgeExpired();
  const entry: ChatGptOAuthAuthorizationCode = {
    ...input,
    code: randomId("cgo_code"),
    expiresAt: Date.now() + CHATGPT_OAUTH_CODE_TTL_MS,
    used: false,
  };
  authorizationCodes.set(entry.code, entry);
  return entry;
}

export function consumeAuthorizationCode(code: string): ChatGptOAuthAuthorizationCode | null {
  purgeExpired();
  const entry = authorizationCodes.get(code);
  if (!entry || entry.used || entry.expiresAt <= Date.now()) {
    authorizationCodes.delete(code);
    return null;
  }
  entry.used = true;
  authorizationCodes.set(code, entry);
  return entry;
}

export function resetChatGptOAuthStoreForTests(): void {
  pendingRequests.clear();
  authorizationCodes.clear();
}
