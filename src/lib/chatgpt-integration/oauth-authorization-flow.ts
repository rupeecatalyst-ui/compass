/**
 * CO-CHATGPT-OAUTH-001 — OAuth authorization start (no DB; no server-only).
 */
import { parseRequestedOAuthScopes, readChatGptOAuthConfig } from "@/lib/chatgpt-integration/oauth-config";
import {
  createOAuthPendingRequest,
  peekOAuthPendingRequest,
} from "@/lib/chatgpt-integration/oauth-store";

export type OAuthAuthorizeParams = {
  responseType: string;
  clientId: string;
  redirectUri: string;
  scope: string | null;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
};

export function beginOAuthAuthorization(params: OAuthAuthorizeParams): {
  requestId: string;
  consentPath: string;
} {
  const config = readChatGptOAuthConfig();
  if (!config) {
    throw Object.assign(new Error("ChatGPT OAuth is not configured."), {
      statusCode: 503,
      code: "OAUTH_NOT_CONFIGURED",
    });
  }

  if (params.responseType !== "code") {
    throw Object.assign(new Error("Only response_type=code is supported."), {
      statusCode: 400,
      code: "UNSUPPORTED_RESPONSE_TYPE",
    });
  }

  if (params.clientId !== config.clientId) {
    throw Object.assign(new Error("Unknown OAuth client_id."), {
      statusCode: 400,
      code: "INVALID_CLIENT",
    });
  }

  if (!config.redirectUris.includes(params.redirectUri)) {
    throw Object.assign(new Error("Invalid redirect_uri for ChatGPT OAuth client."), {
      statusCode: 400,
      code: "INVALID_REDIRECT_URI",
    });
  }

  if (params.codeChallengeMethod !== "S256" || !params.codeChallenge.trim()) {
    throw Object.assign(new Error("PKCE S256 code_challenge is required."), {
      statusCode: 400,
      code: "INVALID_PKCE",
    });
  }

  const requestedScopes = parseRequestedOAuthScopes(params.scope);

  const pending = createOAuthPendingRequest({
    clientId: params.clientId,
    redirectUri: params.redirectUri,
    scope: requestedScopes.join(" "),
    state: params.state,
    codeChallenge: params.codeChallenge,
  });

  return {
    requestId: pending.requestId,
    consentPath: `/integrations/chatgpt/oauth?request=${encodeURIComponent(pending.requestId)}`,
  };
}

export function describeOAuthPendingRequest(requestId: string) {
  const pending = peekOAuthPendingRequest(requestId);
  if (!pending) {
    throw Object.assign(new Error("OAuth request expired or not found."), {
      statusCode: 400,
      code: "INVALID_OAUTH_REQUEST",
    });
  }
  return {
    requestId: pending.requestId,
    clientName: "Catalyst One ChatGPT Integration",
    scopes: pending.scope.split(/\s+/).filter(Boolean),
    state: pending.state,
    expiresAt: new Date(pending.expiresAt).toISOString(),
  };
}
