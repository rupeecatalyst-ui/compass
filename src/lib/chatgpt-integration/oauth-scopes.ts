/**
 * CO-CHATGPT-OAUTH-001 — Scope resolution and endpoint requirements.
 */

import { CHATGPT_OAUTH_SCOPES, type ChatGptOAuthScope } from "@/types/chatgpt-integration-oauth";
import { AI_CAPABILITIES } from "@/constants/enterprise-ai-access";
import type { AiCapability } from "@/constants/enterprise-ai-access";
import type { UserAiCapabilities } from "@/types/enterprise-ai-access";
import type { ChatGptIntegrationEndpoint } from "@/lib/chatgpt-integration/constants";

export function scopesForUserCapabilities(
  capabilities: UserAiCapabilities,
): ChatGptOAuthScope[] {
  const scopes: ChatGptOAuthScope[] = [];
  if (
    capabilities.AI_ACCESS &&
    capabilities.AI_TEXT &&
    capabilities.AI_CATALYST_INTELLIGENCE
  ) {
    scopes.push(CHATGPT_OAUTH_SCOPES.READ);
  }
  if (capabilities.AI_ACCESS && capabilities.AI_CHANAKYA) {
    scopes.push(CHATGPT_OAUTH_SCOPES.CHANAKYA);
  }
  return scopes;
}

export function oauthScopesForEndpoint(endpoint: ChatGptIntegrationEndpoint): ChatGptOAuthScope[] {
  if (endpoint.endsWith("/chanakya") || endpoint.endsWith("/enterprise-read")) {
    return [CHATGPT_OAUTH_SCOPES.READ, CHATGPT_OAUTH_SCOPES.CHANAKYA];
  }
  return [CHATGPT_OAUTH_SCOPES.READ];
}

export function assertTokenScopes(
  tokenScopes: readonly ChatGptOAuthScope[],
  required: readonly ChatGptOAuthScope[],
): void {
  for (const scope of required) {
    if (!tokenScopes.includes(scope)) {
      throw Object.assign(new Error(`Missing OAuth scope: ${scope}`), {
        statusCode: 403,
        code: "OAUTH_SCOPE_DENIED",
        scope,
      });
    }
  }
}

export function aiCapabilitiesForIntegrationEndpoint(
  endpoint: ChatGptIntegrationEndpoint,
): AiCapability[] {
  const base: AiCapability[] = [
    AI_CAPABILITIES.AI_ACCESS,
    AI_CAPABILITIES.AI_TEXT,
  ];
  if (endpoint.endsWith("/chanakya") || endpoint.endsWith("/enterprise-read")) {
    return [...base, AI_CAPABILITIES.AI_CHANAKYA];
  }
  return [...base, AI_CAPABILITIES.AI_CATALYST_INTELLIGENCE];
}
