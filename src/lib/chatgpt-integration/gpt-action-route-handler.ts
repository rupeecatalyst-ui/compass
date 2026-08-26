/**
 * CO-CHATGPT-GPT-ACTION-001 — OAuth-only route handler for ChatGPT Custom GPT Actions.
 * Dual-auth v1 endpoints remain unchanged for non-GPT integration clients.
 */
import "server-only";

import { NextResponse } from "next/server";
import { auditChatGptIntegrationRequest } from "@/lib/chatgpt-integration/audit";
import {
  CHATGPT_INTEGRATION_MODULE,
  CHATGPT_INTEGRATION_TEXT_CAPABILITY,
} from "@/lib/chatgpt-integration/constants";
import type { ChatGptGptActionEndpointDef } from "@/lib/chatgpt-integration/gpt-action-endpoints";
import { isChatGptOAuthConfigured } from "@/lib/chatgpt-integration/oauth-config";
import { resolveChatGptOrganizationContext } from "@/lib/chatgpt-integration/org-context";
import type { ChatGptComposeContext } from "@/lib/chatgpt-integration/route-handler";
import { checkChatGptIntegrationRateLimit } from "@/lib/chatgpt-integration/rate-limit";
import { assertNoSecretsInResponse } from "@/lib/chatgpt-integration/sanitize";
import { authenticateChatGptIntegrationUser } from "@/lib/chatgpt-integration/user-identity";
import { AI_CAPABILITIES, type AiCapability } from "@/constants/enterprise-ai-access";
import { createCorrelationId, OPS_CORRELATION_HEADER } from "@/lib/ops/correlation";
import { errorResponse, successResponse } from "@/lib/api/auth-route-utils";

function methodNotAllowedResponse(requestId: string): NextResponse {
  return errorResponse(
    405,
    "METHOD_NOT_ALLOWED",
    "ChatGPT GPT Action integration is read-only. Only GET is permitted.",
    undefined,
    {
      correlationId: requestId,
      module: CHATGPT_INTEGRATION_MODULE,
      action: "METHOD_NOT_ALLOWED",
    },
  );
}

function userDeniedStatus(code: string): number {
  if (code === "SERVICE_UNAVAILABLE") return 503;
  return 403;
}

export function createChatGptGptActionRouteHandlers(def: ChatGptGptActionEndpointDef): {
  GET: (request: Request) => Promise<NextResponse>;
  POST: (request: Request) => Promise<NextResponse>;
  PUT: (request: Request) => Promise<NextResponse>;
  PATCH: (request: Request) => Promise<NextResponse>;
  DELETE: (request: Request) => Promise<NextResponse>;
} {
  const endpoint = def.gptActionPath;
  const endpointCapabilities = def.capabilities;
  const compose = def.compose as (ctx: ChatGptComposeContext) => Promise<unknown>;

  async function GET(request: Request): Promise<NextResponse> {
    const requestId = createCorrelationId();
    const startedAt = Date.now();

    if (!isChatGptOAuthConfigured()) {
      auditChatGptIntegrationRequest({
        endpoint,
        requestId,
        httpStatus: 503,
        success: false,
        durationMs: Date.now() - startedAt,
        denialCode: "NOT_CONFIGURED",
      });
      return errorResponse(
        503,
        "NOT_CONFIGURED",
        "ChatGPT OAuth is not configured on this deployment.",
        undefined,
        {
          correlationId: requestId,
          module: CHATGPT_INTEGRATION_MODULE,
          action: "NOT_CONFIGURED",
          endpoint,
        },
      );
    }

    const requiredCaps = [
      AI_CAPABILITIES.AI_ACCESS,
      CHATGPT_INTEGRATION_TEXT_CAPABILITY,
      ...endpointCapabilities,
    ] as AiCapability[];

    const userAuth = await authenticateChatGptIntegrationUser(
      request,
      requiredCaps,
      def.canonicalEndpoint,
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

    const rate = checkChatGptIntegrationRateLimit(
      request,
      `gpt-action:${userAuth.actor.userId}`,
    );
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
        requestQuery: new URL(request.url).searchParams,
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
