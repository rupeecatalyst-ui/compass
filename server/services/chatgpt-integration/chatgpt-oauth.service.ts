/**
 * CO-CHATGPT-OAUTH-001 — OAuth consent approval + token exchange (server / DB).
 */
import "server-only";

import { verifyAccessToken } from "@server/services/token.service";
import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  integrationTokenExpiresInSeconds,
  signChatGptIntegrationAccessToken,
  verifyPkceS256,
} from "@/lib/chatgpt-integration/integration-access-token";
import {
  assertOAuthClientCredentials,
  assertRedirectUriAllowed,
  readChatGptOAuthConfig,
} from "@/lib/chatgpt-integration/oauth-config";
import {
  consumeAuthorizationCode,
  consumeOAuthPendingRequest,
  issueAuthorizationCode,
} from "@/lib/chatgpt-integration/oauth-store";
import {
  assertAiCapabilities,
  parseUserAiCapabilitiesJson,
} from "@/lib/enterprise-ai-access/resolve";
import { AI_CAPABILITIES } from "@/constants/enterprise-ai-access";
import { scopesForUserCapabilities } from "@/lib/chatgpt-integration/oauth-scopes";
import {
  CHATGPT_OAUTH_SCOPES,
  type ChatGptOAuthScope,
} from "@/types/chatgpt-integration-oauth";

export {
  beginOAuthAuthorization,
  describeOAuthPendingRequest,
} from "@/lib/chatgpt-integration/oauth-authorization-flow";

export async function approveOAuthConsent(input: {
  requestId: string;
  employeeAccessToken: string;
}): Promise<{ redirectUrl: string }> {
  if (!isDatabaseAvailable()) {
    throw Object.assign(new Error("Database unavailable for OAuth consent."), {
      statusCode: 503,
      code: "SERVICE_UNAVAILABLE",
    });
  }

  const config = readChatGptOAuthConfig();
  if (!config) {
    throw Object.assign(new Error("ChatGPT OAuth is not configured."), {
      statusCode: 503,
      code: "OAUTH_NOT_CONFIGURED",
    });
  }

  let employeePayload;
  try {
    employeePayload = verifyAccessToken(input.employeeAccessToken);
  } catch {
    throw Object.assign(new Error("Invalid employee session for OAuth consent."), {
      statusCode: 401,
      code: "INVALID_EMPLOYEE_SESSION",
    });
  }

  const pending = consumeOAuthPendingRequest(input.requestId);
  if (!pending) {
    throw Object.assign(new Error("OAuth request expired or already used."), {
      statusCode: 400,
      code: "INVALID_OAUTH_REQUEST",
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: employeePayload.userId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      aiCapabilitiesJson: true,
    },
  });

  if (!user || !user.isActive) {
    throw Object.assign(new Error("User inactive or not found."), {
      statusCode: 403,
      code: "USER_INACTIVE",
    });
  }

  const capabilities = parseUserAiCapabilitiesJson(user.aiCapabilitiesJson);

  try {
    assertAiCapabilities(capabilities, [
      AI_CAPABILITIES.AI_ACCESS,
      AI_CAPABILITIES.AI_TEXT,
    ]);
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: string }).code)
        : "AI_ACCESS_DENIED";
    throw Object.assign(new Error("AI access required to authorize ChatGPT integration."), {
      statusCode: 403,
      code: code === "AI_CAPABILITY_DENIED" ? "AI_CAPABILITY_DENIED" : "AI_ACCESS_DENIED",
    });
  }

  const grantable = scopesForUserCapabilities(capabilities);
  const requested = pending.scope.split(/\s+/).filter(Boolean) as ChatGptOAuthScope[];
  const grantedScopes = requested.filter((scope) => grantable.includes(scope));

  if (!grantedScopes.includes(CHATGPT_OAUTH_SCOPES.READ)) {
    throw Object.assign(
      new Error("User lacks AI capabilities required for chatgpt:read scope."),
      { statusCode: 403, code: "AI_CAPABILITY_DENIED" },
    );
  }

  const organizationId = await resolvePilotOrganizationId();
  if (!organizationId?.trim()) {
    throw Object.assign(new Error("Organization context unavailable."), {
      statusCode: 503,
      code: "ORG_CONTEXT_UNAVAILABLE",
    });
  }

  const authCode = issueAuthorizationCode({
    userId: user.id,
    organizationId,
    scopes: grantedScopes,
    redirectUri: pending.redirectUri,
    codeChallenge: pending.codeChallenge,
    codeChallengeMethod: "S256",
    clientId: pending.clientId,
  });

  const redirect = new URL(pending.redirectUri);
  redirect.searchParams.set("code", authCode.code);
  if (pending.state) redirect.searchParams.set("state", pending.state);

  return { redirectUrl: redirect.toString() };
}

export async function exchangeOAuthAuthorizationCode(input: {
  grantType: string;
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  codeVerifier: string;
}): Promise<{
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: string;
}> {
  const config = readChatGptOAuthConfig();
  if (!config) {
    throw Object.assign(new Error("ChatGPT OAuth is not configured."), {
      statusCode: 503,
      code: "OAUTH_NOT_CONFIGURED",
    });
  }

  if (input.grantType !== "authorization_code") {
    throw Object.assign(new Error("Unsupported grant_type."), {
      statusCode: 400,
      code: "UNSUPPORTED_GRANT_TYPE",
    });
  }

  assertOAuthClientCredentials(input.clientId, input.clientSecret, config);
  assertRedirectUriAllowed(input.redirectUri, config);

  const authCode = consumeAuthorizationCode(input.code);
  if (!authCode) {
    throw Object.assign(new Error("Invalid or expired authorization code."), {
      statusCode: 400,
      code: "INVALID_GRANT",
    });
  }

  if (authCode.clientId !== input.clientId || authCode.redirectUri !== input.redirectUri) {
    throw Object.assign(new Error("Authorization code client/redirect mismatch."), {
      statusCode: 400,
      code: "INVALID_GRANT",
    });
  }

  if (!verifyPkceS256(input.codeVerifier, authCode.codeChallenge)) {
    throw Object.assign(new Error("Invalid PKCE code_verifier."), {
      statusCode: 400,
      code: "INVALID_PKCE",
    });
  }

  if (!isDatabaseAvailable()) {
    throw Object.assign(new Error("Database unavailable."), {
      statusCode: 503,
      code: "SERVICE_UNAVAILABLE",
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: authCode.userId },
    select: { id: true, email: true, role: true, isActive: true, aiCapabilitiesJson: true },
  });

  if (!user || !user.isActive) {
    throw Object.assign(new Error("User inactive or not found."), {
      statusCode: 403,
      code: "USER_INACTIVE",
    });
  }

  const capabilities = parseUserAiCapabilitiesJson(user.aiCapabilitiesJson);
  assertAiCapabilities(capabilities, [AI_CAPABILITIES.AI_ACCESS, AI_CAPABILITIES.AI_TEXT]);

  const currentOrgId = await resolvePilotOrganizationId();
  if (!currentOrgId || currentOrgId !== authCode.organizationId) {
    throw Object.assign(new Error("Organization context mismatch."), {
      statusCode: 403,
      code: "ORG_MISMATCH",
    });
  }

  const accessToken = signChatGptIntegrationAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    organizationId: authCode.organizationId,
    scopes: authCode.scopes,
  });

  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: integrationTokenExpiresInSeconds(),
    scope: authCode.scopes.join(" "),
  };
}
