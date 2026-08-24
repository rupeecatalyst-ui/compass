/**
 * CO-AI-ACCESS-001 + CO-CHATGPT-OAUTH-001 — Integration user identity.
 * Accepts only audience-scoped ChatGPT integration tokens (not employee JWT).
 */
import "server-only";

import {
  verifyChatGptIntegrationAccessToken,
} from "@/lib/chatgpt-integration/integration-access-token";
import {
  classifyIntegrationBearerToken,
  looksLikeJwt,
} from "@/lib/chatgpt-integration/integration-token-classifier";
import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  assertAiCapabilities,
  parseUserAiCapabilitiesJson,
} from "@/lib/enterprise-ai-access/resolve";
import type { AiCapability } from "@/constants/enterprise-ai-access";
import type { AiAccessActor, UserAiCapabilities } from "@/types/enterprise-ai-access";
import { rejectSpoofedUserIdentity } from "@/lib/chatgpt-integration/spoof-guard";
import {
  assertTokenScopes,
  oauthScopesForEndpoint,
} from "@/lib/chatgpt-integration/oauth-scopes";
import type { ChatGptIntegrationEndpoint } from "@/lib/chatgpt-integration/constants";

export type ChatGptUserAuthResult =
  | {
      ok: true;
      actor: AiAccessActor;
      capabilities: UserAiCapabilities;
    }
  | {
      ok: false;
      code:
        | "MISSING_USER_TOKEN"
        | "INVALID_USER_TOKEN"
        | "EMPLOYEE_TOKEN_NOT_ALLOWED"
        | "WRONG_TOKEN_AUDIENCE"
        | "USER_INACTIVE"
        | "USER_NOT_FOUND"
        | "AI_ACCESS_DENIED"
        | "AI_CAPABILITY_DENIED"
        | "AI_ACTIONS_UNAVAILABLE"
        | "OAUTH_SCOPE_DENIED"
        | "ORG_MISMATCH"
        | "IDENTITY_SPOOFING_REJECTED"
        | "SERVICE_UNAVAILABLE";
      message: string;
      capability?: AiCapability;
    };

export function extractIntegrationBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token || !looksLikeJwt(token)) return null;
  return token;
}

export async function authenticateChatGptIntegrationUser(
  request: Request,
  requiredCapabilities: readonly AiCapability[],
  endpoint: ChatGptIntegrationEndpoint,
): Promise<ChatGptUserAuthResult> {
  const spoof = rejectSpoofedUserIdentity(request);
  if (spoof) {
    return { ok: false, code: spoof.code, message: spoof.message };
  }

  const token = extractIntegrationBearerToken(request);
  if (!token) {
    return {
      ok: false,
      code: "MISSING_USER_TOKEN",
      message:
        "ChatGPT integration access token required. Complete OAuth authorization to obtain a short-lived token.",
    };
  }

  const lane = classifyIntegrationBearerToken(token);
  if (lane === "employee") {
    return {
      ok: false,
      code: "EMPLOYEE_TOKEN_NOT_ALLOWED",
      message:
        "Employee session JWT cannot access ChatGPT integration APIs. Use OAuth to obtain a dedicated integration token.",
    };
  }
  if (lane === "invalid") {
    return {
      ok: false,
      code: "INVALID_USER_TOKEN",
      message: "Invalid or expired ChatGPT integration access token.",
    };
  }

  let payload;
  try {
    payload = verifyChatGptIntegrationAccessToken(token);
  } catch {
    return {
      ok: false,
      code: "INVALID_USER_TOKEN",
      message: "Invalid or expired ChatGPT integration access token.",
    };
  }

  if (!isDatabaseAvailable()) {
    return {
      ok: false,
      code: "SERVICE_UNAVAILABLE",
      message: "AI access control requires database availability.",
    };
  }

  try {
    assertTokenScopes(payload.scopes, oauthScopesForEndpoint(endpoint));
  } catch (err) {
    return {
      ok: false,
      code: "OAUTH_SCOPE_DENIED",
      message: err instanceof Error ? err.message : "OAuth scope denied for this endpoint.",
    };
  }

  const pilotOrgId = await resolvePilotOrganizationId();
  if (!pilotOrgId || pilotOrgId !== payload.organizationId) {
    return {
      ok: false,
      code: "ORG_MISMATCH",
      message: "Integration token organization does not match deployment context.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      aiCapabilitiesJson: true,
    },
  });

  if (!user) {
    return {
      ok: false,
      code: "USER_NOT_FOUND",
      message: "Authenticated user not found.",
    };
  }

  if (!user.isActive) {
    return {
      ok: false,
      code: "USER_INACTIVE",
      message: "User account is inactive.",
    };
  }

  const capabilities = parseUserAiCapabilitiesJson(user.aiCapabilitiesJson);

  try {
    assertAiCapabilities(capabilities, requiredCapabilities);
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? (err as { code?: string }).code
        : "AI_ACCESS_DENIED";
    const capability =
      err && typeof err === "object" && "capability" in err
        ? (err as { capability?: AiCapability }).capability
        : undefined;
    return {
      ok: false,
      code:
        code === "AI_CAPABILITY_DENIED"
          ? "AI_CAPABILITY_DENIED"
          : code === "AI_ACTIONS_UNAVAILABLE"
            ? "AI_ACTIONS_UNAVAILABLE"
            : "AI_ACCESS_DENIED",
      message: err instanceof Error ? err.message : "AI access denied.",
      capability,
    };
  }

  return {
    ok: true,
    actor: {
      userId: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
    capabilities,
  };
}
