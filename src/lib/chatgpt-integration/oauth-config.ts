/**
 * CO-CHATGPT-OAUTH-001 — OAuth client configuration (env-driven).
 */
import { timingSafeEqual } from "node:crypto";
import {
  CHATGPT_OAUTH_CLIENT_ID_ENV,
  CHATGPT_OAUTH_CLIENT_SECRET_ENV,
  CHATGPT_OAUTH_REDIRECT_URIS_ENV,
} from "@/constants/chatgpt-integration-oauth";
import { isChatGptOAuthRedirectUriAllowed } from "@/lib/chatgpt-integration/oauth-redirect-uri";

export type ChatGptOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
};

export function isChatGptOAuthConfigured(): boolean {
  return readChatGptOAuthConfig() !== null;
}

export function readChatGptOAuthConfig(): ChatGptOAuthConfig | null {
  const clientId = process.env[CHATGPT_OAUTH_CLIENT_ID_ENV]?.trim();
  const clientSecret = process.env[CHATGPT_OAUTH_CLIENT_SECRET_ENV]?.trim();
  const redirectUris = (process.env[CHATGPT_OAUTH_REDIRECT_URIS_ENV] ?? "")
    .split(",")
    .map((uri) => uri.trim())
    .filter(Boolean);

  if (!clientId || !clientSecret || redirectUris.length === 0) return null;
  return { clientId, clientSecret, redirectUris };
}

export function assertRedirectUriAllowed(redirectUri: string, config: ChatGptOAuthConfig): void {
  if (!isChatGptOAuthRedirectUriAllowed(redirectUri, config.redirectUris)) {
    throw Object.assign(new Error("Invalid redirect_uri for ChatGPT OAuth client."), {
      statusCode: 400,
      code: "INVALID_REDIRECT_URI",
    });
  }
}

export function assertOAuthClientCredentials(
  clientId: string,
  clientSecret: string,
  config: ChatGptOAuthConfig,
): void {
  const idOk =
    clientId.length === config.clientId.length &&
    timingSafeEqual(Buffer.from(clientId), Buffer.from(config.clientId));
  const secretOk =
    clientSecret.length === config.clientSecret.length &&
    timingSafeEqual(Buffer.from(clientSecret), Buffer.from(config.clientSecret));

  if (!idOk || !secretOk) {
    throw Object.assign(new Error("Invalid OAuth client credentials."), {
      statusCode: 401,
      code: "INVALID_CLIENT",
    });
  }
}

export const CHATGPT_OAUTH_ALLOWED_SCOPES = ["chatgpt:read", "chatgpt:chanakya"] as const;

export function parseRequestedOAuthScopes(scopeParam: string | null): string[] {
  if (!scopeParam?.trim()) return [...CHATGPT_OAUTH_ALLOWED_SCOPES];
  const requested = scopeParam
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const scope of requested) {
    if (!(CHATGPT_OAUTH_ALLOWED_SCOPES as readonly string[]).includes(scope)) {
      throw Object.assign(new Error(`Unsupported OAuth scope: ${scope}`), {
        statusCode: 400,
        code: "INVALID_SCOPE",
        scope,
      });
    }
  }
  return requested;
}
