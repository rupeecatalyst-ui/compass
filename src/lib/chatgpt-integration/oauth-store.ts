/**
 * CO-CHATGPT-OAUTH-001 — In-memory OAuth authorization code + pending request store.
 * CO-CHANAKYA-ENTERPRISE-READ-CONTEXT-002 — refresh token store (hashed, rotatable).
 */
import { createHash, randomBytes } from "node:crypto";
import {
  CHATGPT_OAUTH_CODE_TTL_MS,
  CHATGPT_OAUTH_REFRESH_TOKEN_TTL_MS,
  CHATGPT_OAUTH_REQUEST_TTL_MS,
} from "@/constants/chatgpt-integration-oauth";
import type {
  ChatGptOAuthAuthorizationCode,
  ChatGptOAuthPendingRequest,
  ChatGptOAuthRefreshTokenRecord,
  ChatGptOAuthScope,
} from "@/types/chatgpt-integration-oauth";

const pendingRequests = new Map<string, ChatGptOAuthPendingRequest>();
const authorizationCodes = new Map<string, ChatGptOAuthAuthorizationCode>();
/** Hash → refresh record (never store plaintext refresh tokens). */
const refreshTokens = new Map<string, ChatGptOAuthRefreshTokenRecord>();

function purgeExpired(): void {
  const now = Date.now();
  for (const [id, req] of pendingRequests) {
    if (req.expiresAt <= now) pendingRequests.delete(id);
  }
  for (const [code, entry] of authorizationCodes) {
    if (entry.expiresAt <= now || entry.used) authorizationCodes.delete(code);
  }
  for (const [hash, entry] of refreshTokens) {
    if (entry.expiresAt <= now || entry.revoked) refreshTokens.delete(hash);
  }
}

export function hashChatGptOAuthRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function randomId(prefix: string): string {
  return `${prefix}_${randomBytes(16).toString("base64url")}`;
}

export function createOAuthPendingRequest(
  input: Omit<ChatGptOAuthPendingRequest, "requestId" | "createdAt" | "expiresAt">,
): ChatGptOAuthPendingRequest {
  purgeExpired();
  const now = Date.now();
  const request: ChatGptOAuthPendingRequest = {
    ...input,
    requestId: randomId("cgo_req"),
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

export function issueOAuthRefreshToken(input: {
  userId: string;
  organizationId: string;
  scopes: ChatGptOAuthScope[];
  clientId: string;
  rotatedFromHash?: string | null;
}): { refreshToken: string; record: ChatGptOAuthRefreshTokenRecord } {
  purgeExpired();
  if (input.rotatedFromHash) {
    const prior = refreshTokens.get(input.rotatedFromHash);
    if (prior) {
      prior.revoked = true;
      refreshTokens.set(input.rotatedFromHash, prior);
    }
  }
  const refreshToken = randomId("cgo_rt");
  const tokenHash = hashChatGptOAuthRefreshToken(refreshToken);
  const now = Date.now();
  const record: ChatGptOAuthRefreshTokenRecord = {
    tokenHash,
    userId: input.userId,
    organizationId: input.organizationId,
    scopes: input.scopes,
    clientId: input.clientId,
    createdAt: now,
    expiresAt: now + CHATGPT_OAUTH_REFRESH_TOKEN_TTL_MS,
    revoked: false,
    rotatedFromHash: input.rotatedFromHash ?? null,
  };
  refreshTokens.set(tokenHash, record);
  return { refreshToken, record };
}

export function consumeOAuthRefreshToken(
  refreshToken: string,
  clientId: string,
): ChatGptOAuthRefreshTokenRecord | null {
  purgeExpired();
  const tokenHash = hashChatGptOAuthRefreshToken(refreshToken);
  const entry = refreshTokens.get(tokenHash);
  if (!entry || entry.revoked || entry.expiresAt <= Date.now()) {
    refreshTokens.delete(tokenHash);
    return null;
  }
  if (entry.clientId !== clientId) return null;
  return entry;
}

export function revokeOAuthRefreshToken(refreshToken: string): boolean {
  const tokenHash = hashChatGptOAuthRefreshToken(refreshToken);
  const entry = refreshTokens.get(tokenHash);
  if (!entry) return false;
  entry.revoked = true;
  refreshTokens.set(tokenHash, entry);
  return true;
}

export function resetChatGptOAuthStoreForTests(): void {
  pendingRequests.clear();
  authorizationCodes.clear();
  refreshTokens.clear();
}
