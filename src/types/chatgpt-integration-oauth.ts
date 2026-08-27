/**
 * CO-CHATGPT-OAUTH-001 — OAuth token contracts for ChatGPT integration.
 */

export const CHATGPT_INTEGRATION_TOKEN_AUDIENCE = "catalyst_one_chatgpt" as const;
export const CHATGPT_INTEGRATION_TOKEN_TYPE = "chatgpt_integration_access" as const;

export const CHATGPT_OAUTH_SCOPES = {
  READ: "chatgpt:read",
  CHANAKYA: "chatgpt:chanakya",
} as const;

export type ChatGptOAuthScope =
  (typeof CHATGPT_OAUTH_SCOPES)[keyof typeof CHATGPT_OAUTH_SCOPES];

export interface ChatGptIntegrationTokenPayload {
  userId: string;
  email: string;
  role: string;
  organizationId: string;
  scopes: ChatGptOAuthScope[];
  aud: typeof CHATGPT_INTEGRATION_TOKEN_AUDIENCE;
  typ: typeof CHATGPT_INTEGRATION_TOKEN_TYPE;
}

export type ChatGptOAuthPendingRequest = {
  requestId: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  /** Empty when ChatGPT confidential-client authorize omits PKCE. */
  codeChallenge: string;
  /** S256 when PKCE was presented; null for confidential-client (no PKCE). */
  codeChallengeMethod: "S256" | null;
  createdAt: number;
  expiresAt: number;
};

export type ChatGptOAuthAuthorizationCode = {
  code: string;
  userId: string;
  organizationId: string;
  scopes: ChatGptOAuthScope[];
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: "S256" | null;
  clientId: string;
  expiresAt: number;
  used: boolean;
};

/** Server-side refresh credential (plaintext token never logged). */
export type ChatGptOAuthRefreshTokenRecord = {
  /** SHA-256 hex of the opaque refresh token. */
  tokenHash: string;
  userId: string;
  organizationId: string;
  scopes: ChatGptOAuthScope[];
  clientId: string;
  createdAt: number;
  expiresAt: number;
  revoked: boolean;
  /** Rotation: previous hash invalidated when a new refresh is issued. */
  rotatedFromHash?: string | null;
};
