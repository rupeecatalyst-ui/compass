/**
 * CO-CHATGPT-OAUTH-001 — OAuth constants (authorization code + PKCE).
 */

export const CHATGPT_OAUTH_CLIENT_ID_ENV = "CHATGPT_OAUTH_CLIENT_ID" as const;
export const CHATGPT_OAUTH_CLIENT_SECRET_ENV = "CHATGPT_OAUTH_CLIENT_SECRET" as const;
export const CHATGPT_OAUTH_REDIRECT_URIS_ENV = "CHATGPT_OAUTH_REDIRECT_URIS" as const;

/** Short-lived integration bearer — not an employee session JWT. */
export const CHATGPT_INTEGRATION_TOKEN_TTL = "30m" as const;
export const CHATGPT_INTEGRATION_TOKEN_TTL_SECONDS = 30 * 60;

/**
 * CO-CHANAKYA-ENTERPRISE-READ-CONTEXT-002 — refresh token lifetime.
 * Enables silent access-token renewal without re-consent while the refresh
 * credential remains valid. Not "forever" — reconnect when revoked / expired /
 * scopes change / provider requires reauthorization.
 */
export const CHATGPT_OAUTH_REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const CHATGPT_OAUTH_REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

export const CHATGPT_OAUTH_CODE_TTL_MS = 5 * 60 * 1000;
export const CHATGPT_OAUTH_REQUEST_TTL_MS = 10 * 60 * 1000;

export const CHATGPT_OAUTH_AUTHORIZE_PATH = "/api/integrations/chatgpt/v1/oauth/authorize" as const;
export const CHATGPT_OAUTH_TOKEN_PATH = "/api/integrations/chatgpt/v1/oauth/token" as const;
export const CHATGPT_OAUTH_CONSENT_UI_PATH = "/integrations/chatgpt/oauth" as const;

/**
 * CO-CHANAKYA-GPT-OAUTH-CALLBACK-CLOSURE-045 — built-in OpenAI callback hosts/paths.
 * GPT Builder does not surface the callback URL; OpenAI sends it on authorize.
 */
export const CHATGPT_OAUTH_BUILTIN_REDIRECT_HOSTS = new Set([
  "chat.openai.com",
  "chatgpt.com",
]);

/** GPT id segment: g- plus OpenAI alphanumeric id (e.g. g-abc123XYZ). */
export const CHATGPT_OAUTH_GPT_ID_SEGMENT = "g-[A-Za-z0-9_-]+";

export const CHATGPT_OAUTH_BUILTIN_REDIRECT_PATH_PATTERNS: readonly RegExp[] = [
  /^\/aip\/oauth\/callback$/,
  new RegExp(`^/aip/${CHATGPT_OAUTH_GPT_ID_SEGMENT}/oauth/callback$`),
  /^\/connector_platform_oauth_redirect$/,
  /^\/connector\/oauth\/[A-Za-z0-9_-]+$/,
];
