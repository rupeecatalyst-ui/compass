/**
 * CO-CHATGPT-OAUTH-001 — OAuth constants (authorization code + PKCE).
 */

export const CHATGPT_OAUTH_CLIENT_ID_ENV = "CHATGPT_OAUTH_CLIENT_ID" as const;
export const CHATGPT_OAUTH_CLIENT_SECRET_ENV = "CHATGPT_OAUTH_CLIENT_SECRET" as const;
export const CHATGPT_OAUTH_REDIRECT_URIS_ENV = "CHATGPT_OAUTH_REDIRECT_URIS" as const;

/** Short-lived integration bearer — not an employee session JWT. */
export const CHATGPT_INTEGRATION_TOKEN_TTL = "30m" as const;
export const CHATGPT_INTEGRATION_TOKEN_TTL_SECONDS = 30 * 60;

export const CHATGPT_OAUTH_CODE_TTL_MS = 5 * 60 * 1000;
export const CHATGPT_OAUTH_REQUEST_TTL_MS = 10 * 60 * 1000;

export const CHATGPT_OAUTH_AUTHORIZE_PATH = "/api/integrations/chatgpt/v1/oauth/authorize" as const;
export const CHATGPT_OAUTH_TOKEN_PATH = "/api/integrations/chatgpt/v1/oauth/token" as const;
export const CHATGPT_OAUTH_CONSENT_UI_PATH = "/integrations/chatgpt/oauth" as const;
