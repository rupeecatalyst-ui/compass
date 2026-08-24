/**
 * CO-CHATGPT-OAUTH-001 — Integration JWT sign/verify (shared; no server-only).
 */
import jwt from "jsonwebtoken";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  CHATGPT_INTEGRATION_TOKEN_TTL,
  CHATGPT_INTEGRATION_TOKEN_TTL_SECONDS,
} from "@/constants/chatgpt-integration-oauth";
import {
  CHATGPT_INTEGRATION_TOKEN_AUDIENCE,
  CHATGPT_INTEGRATION_TOKEN_TYPE,
  type ChatGptIntegrationTokenPayload,
  type ChatGptOAuthScope,
} from "@/types/chatgpt-integration-oauth";

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET is required for integration token signing");
  }
  return secret;
}

export function signChatGptIntegrationAccessToken(input: {
  userId: string;
  email: string;
  role: string;
  organizationId: string;
  scopes: ChatGptOAuthScope[];
}): string {
  const body = {
    userId: input.userId,
    email: input.email,
    role: input.role,
    organizationId: input.organizationId,
    scopes: input.scopes,
    typ: CHATGPT_INTEGRATION_TOKEN_TYPE,
  };
  return jwt.sign(body, jwtSecret(), {
    expiresIn: CHATGPT_INTEGRATION_TOKEN_TTL as jwt.SignOptions["expiresIn"],
    audience: CHATGPT_INTEGRATION_TOKEN_AUDIENCE,
  });
}

export function verifyChatGptIntegrationAccessToken(token: string): ChatGptIntegrationTokenPayload {
  const payload = jwt.verify(token, jwtSecret(), {
    audience: CHATGPT_INTEGRATION_TOKEN_AUDIENCE,
  }) as ChatGptIntegrationTokenPayload;

  if (payload.typ !== CHATGPT_INTEGRATION_TOKEN_TYPE) {
    throw new Error("Invalid ChatGPT integration token type");
  }
  if (!payload.userId || !payload.organizationId || !Array.isArray(payload.scopes)) {
    throw new Error("Invalid ChatGPT integration token claims");
  }

  return {
    ...payload,
    aud: CHATGPT_INTEGRATION_TOKEN_AUDIENCE,
    typ: CHATGPT_INTEGRATION_TOKEN_TYPE,
  };
}

export function integrationTokenExpiresInSeconds(): number {
  return CHATGPT_INTEGRATION_TOKEN_TTL_SECONDS;
}

export function verifyPkceS256(codeVerifier: string, codeChallenge: string): boolean {
  const digest = createHash("sha256").update(codeVerifier).digest("base64url");
  const a = Buffer.from(digest);
  const b = Buffer.from(codeChallenge);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isChatGptIntegrationTokenPayload(
  payload: jwt.JwtPayload,
): payload is ChatGptIntegrationTokenPayload {
  const aud = payload.aud;
  const audList = Array.isArray(aud) ? aud : aud ? [aud] : [];
  return (
    payload.typ === CHATGPT_INTEGRATION_TOKEN_TYPE ||
    audList.includes(CHATGPT_INTEGRATION_TOKEN_AUDIENCE)
  );
}
