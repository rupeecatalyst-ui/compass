/**
 * CO-CHATGPT-INTEGRATION-V1 — Shared GET route handler (fail closed).
 * CO-AI-ACCESS-001 — Requires integration key + OAuth integration token + AI capabilities.
 */
import "server-only";

import { NextResponse } from "next/server";
import {
  authenticateChatGptIntegration,
  extractChatGptIntegrationApiKey,
} from "@/lib/chatgpt-integration/auth";
import { auditChatGptIntegrationRequest } from "@/lib/chatgpt-integration/audit";
import {
  CHATGPT_INTEGRATION_MODULE,
  CHATGPT_INTEGRATION_TEXT_CAPABILITY,
  CHATGPT_INTEGRATION_VERSION,
} from "@/lib/chatgpt-integration/constants";
import { resolveChatGptOrganizationContext, type ChatGptOrgContext } from "@/lib/chatgpt-integration/org-context";
import { checkChatGptIntegrationRateLimit } from "@/lib/chatgpt-integration/rate-limit";
import { assertNoSecretsInResponse } from "@/lib/chatgpt-integration/sanitize";
import { authenticateChatGptIntegrationUser } from "@/lib/chatgpt-integration/user-identity";
import { AI_CAPABILITIES, type AiCapability } from "@/constants/enterprise-ai-access";
import { createCorrelationId, OPS_CORRELATION_HEADER } from "@/lib/ops/correlation";
import { errorResponse, successResponse } from "@/lib/api/auth-route-utils";
import type { ChatGptIntegrationEndpoint } from "@/lib/chatgpt-integration/constants";
import type { ChatGptIntegrationMeta } from "@/types/chatgpt-integration";
import type { AiAccessActor } from "@/types/enterprise-ai-access";

export type ChatGptComposeContext = ChatGptOrgContext & {
  requestId: string;
  generatedAt: string;
  actor: AiAccessActor;
};

export function buildChatGptIntegrationMeta(
  ctx: ChatGptComposeContext,
): ChatGptIntegrationMeta {
  return {
    requestId: ctx.requestId,
    generatedAt: ctx.generatedAt,
    organizationId: ctx.organizationId,
    organizationSlug: ctx.organizationSlug,
    integrationVersion: CHATGPT_INTEGRATION_VERSION,
  };
}

function methodNotAllowedResponse(requestId: string): NextResponse {
  return errorResponse(
    405,
    "METHOD_NOT_ALLOWED",
    "ChatGPT integration V1 is read-only. Only GET is permitted.",
    undefined,
    {
      correlationId: requestId,
      module: CHATGPT_INTEGRATION_MODULE,
      action: "METHOD_NOT_ALLOWED",
    },
  );
}

function integrationDeniedStatus(code: string): number {
  if (code === "NOT_CONFIGURED" || code === "SERVICE_UNAVAILABLE") return 503;
  if (code === "RATE_LIMIT_EXCEEDED") return 429;
  return 401;
}

function userDeniedStatus(code: string): number {
  if (code === "SERVICE_UNAVAILABLE") return 503;
  return 403;
}

export function createChatGptIntegrationRouteHandlers<T>(
  endpoint: string,
  endpointCapabilities: readonly AiCapability[],
  compose: (ctx: ChatGptComposeContext) => Promise<T>,
): {
  GET: (request: Request) => Promise<NextResponse>;
  POST: (request: Request) => Promise<NextResponse>;
  PUT: (request: Request) => Promise<NextResponse>;
  PATCH: (request: Request) => Promise<NextResponse>;
  DELETE: (request: Request) => Promise<NextResponse>;
} {
  async function GET(request: Request): Promise<NextResponse> {
    const requestId = createCorrelationId();
    const startedAt = Date.now();

    const auth = authenticateChatGptIntegration(request);
    if (!auth.ok) {
      const status = integrationDeniedStatus(auth.code);
      auditChatGptIntegrationRequest({
        endpoint,
        requestId,
        httpStatus: status,
        success: false,
        durationMs: Date.now() - startedAt,
        denialCode: auth.code,
      });
      return errorResponse(status, auth.code, auth.message, undefined, {
        correlationId: requestId,
        module: CHATGPT_INTEGRATION_MODULE,
        action: auth.code,
        endpoint,
      });
    }

    const requiredCaps = [
      AI_CAPABILITIES.AI_ACCESS,
      CHATGPT_INTEGRATION_TEXT_CAPABILITY,
      ...endpointCapabilities,
    ] as AiCapability[];

    const userAuth = await authenticateChatGptIntegrationUser(
      request,
      requiredCaps,
      endpoint as ChatGptIntegrationEndpoint,
    );
    if (!userAuth.ok) {
      const status = userDeniedStatus(userAuth.code);
      auditChatGptIntegrationRequest({
        endpoint,
        requestId,
        httpStatus: status,
        success: false,
        durationMs: Date.now() - startedAt,
        actorUserId: null,
        denialCode: userAuth.code,
      });
      return errorResponse(status, userAuth.code, userAuth.message, undefined, {
        correlationId: requestId,
        module: CHATGPT_INTEGRATION_MODULE,
        action: userAuth.code,
        endpoint,
      });
    }

    const apiKey = extractChatGptIntegrationApiKey(request);
    const rate = checkChatGptIntegrationRateLimit(request, apiKey);
    if (!rate.allowed) {
      auditChatGptIntegrationRequest({
        endpoint,
        requestId,
        httpStatus: 429,
        success: false,
        durationMs: Date.now() - startedAt,
        actorUserId: userAuth.actor.userId,
        denialCode: "RATE_LIMIT_EXCEEDED",
      });
      const res = errorResponse(
        429,
        "RATE_LIMIT_EXCEEDED",
        "ChatGPT integration rate limit exceeded. Retry later.",
        undefined,
        {
          correlationId: requestId,
          module: CHATGPT_INTEGRATION_MODULE,
          action: "RATE_LIMIT_EXCEEDED",
          endpoint,
          userId: userAuth.actor.userId,
        },
      );
      res.headers.set("Retry-After", String(rate.retryAfterSec));
      res.headers.set("X-RateLimit-Remaining", "0");
      res.headers.set("X-RateLimit-Reset", String(Math.floor(rate.resetAt / 1000)));
      return res;
    }

    try {
      const org = await resolveChatGptOrganizationContext();
      const ctx: ChatGptComposeContext = {
        ...org,
        requestId,
        generatedAt: new Date().toISOString(),
        actor: userAuth.actor,
      };
      const data = await compose(ctx);
      assertNoSecretsInResponse(data);

      auditChatGptIntegrationRequest({
        endpoint,
        requestId,
        httpStatus: 200,
        success: true,
        durationMs: Date.now() - startedAt,
        actorUserId: userAuth.actor.userId,
      });

      const res = successResponse(data, 200, requestId);
      res.headers.set(OPS_CORRELATION_HEADER, requestId);
      res.headers.set("X-RateLimit-Remaining", String(rate.remaining));
      res.headers.set("X-RateLimit-Reset", String(Math.floor(rate.resetAt / 1000)));
      return res;
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code?: string }).code)
          : "INTEGRATION_COMPOSE_FAILED";
      const message =
        err instanceof Error ? err.message : "Failed to compose ChatGPT integration response.";
      const status =
        err && typeof err === "object" && "statusCode" in err
          ? Number((err as { statusCode?: number }).statusCode) || 500
          : 500;

      auditChatGptIntegrationRequest({
        endpoint,
        requestId,
        httpStatus: status,
        success: false,
        durationMs: Date.now() - startedAt,
        actorUserId: userAuth.actor.userId,
        denialCode: code,
      });

      return errorResponse(status, code, message, undefined, {
        correlationId: requestId,
        module: CHATGPT_INTEGRATION_MODULE,
        action: code,
        endpoint,
        userId: userAuth.actor.userId,
      });
    }
  }

  async function rejectMutation(): Promise<NextResponse> {
    const requestId = createCorrelationId();
    auditChatGptIntegrationRequest({
      endpoint,
      requestId,
      httpStatus: 405,
      success: false,
    });
    return methodNotAllowedResponse(requestId);
  }

  return {
    GET,
    POST: rejectMutation,
    PUT: rejectMutation,
    PATCH: rejectMutation,
    DELETE: rejectMutation,
  };
}
