import { NextResponse } from "next/server";
import {
  exchangeOAuthAuthorizationCode,
  exchangeOAuthRefreshToken,
} from "@server/services/chatgpt-integration/chatgpt-oauth.service";
import { mapOAuthRouteError } from "@/lib/chatgpt-integration/oauth-route-utils";
import { createCorrelationId } from "@/lib/ops/correlation";
import { recordBusinessAudit } from "@/lib/ops/record";
import { CHATGPT_INTEGRATION_MODULE } from "@/lib/chatgpt-integration/constants";

async function parseTokenRequestBody(request: Request): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") ?? "";
  const raw = await request.text();
  if (!raw.trim()) return {};

  if (contentType.includes("application/json")) {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, String(value ?? "")]),
    );
  }

  const params = new URLSearchParams(raw);
  return Object.fromEntries(params.entries());
}

/**
 * OAuth 2.0 token endpoint.
 * Supports authorization_code (+ PKCE) and refresh_token grants.
 * CO-CHANAKYA-ENTERPRISE-READ-CONTEXT-002 — refresh enables silent renewal.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const correlationId = createCorrelationId();
  let fields: Record<string, string>;
  try {
    fields = await parseTokenRequestBody(request);
  } catch {
    return mapOAuthRouteError(
      Object.assign(new Error("Invalid token request body."), {
        statusCode: 400,
        code: "INVALID_BODY",
      }),
      "oauth.token",
    );
  }

  const grantType = fields.grant_type ?? "";

  try {
    const tokenResponse =
      grantType === "refresh_token"
        ? await exchangeOAuthRefreshToken({
            grantType,
            refreshToken: fields.refresh_token ?? "",
            clientId: fields.client_id ?? "",
            clientSecret: fields.client_secret ?? "",
          })
        : await exchangeOAuthAuthorizationCode({
            grantType,
            code: fields.code ?? "",
            redirectUri: fields.redirect_uri ?? "",
            clientId: fields.client_id ?? "",
            clientSecret: fields.client_secret ?? "",
            codeVerifier: fields.code_verifier ?? "",
          });

    recordBusinessAudit({
      actorUserId: null,
      module: CHATGPT_INTEGRATION_MODULE,
      action:
        grantType === "refresh_token" ? "oauth.token.refreshed" : "oauth.token.issued",
      entityId: correlationId,
      previousValue: null,
      newValue: {
        scope: tokenResponse.scope,
        expires_in: tokenResponse.expires_in,
        grant_type: grantType,
        // Never log access_token / refresh_token
      },
      result: "Success",
      correlationId,
    });

    return NextResponse.json(tokenResponse, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    });
  } catch (err) {
    recordBusinessAudit({
      actorUserId: null,
      module: CHATGPT_INTEGRATION_MODULE,
      action: "oauth.token.denied",
      entityId: correlationId,
      previousValue: null,
      newValue: err instanceof Error ? err.message : "denied",
      result: "Failure",
      correlationId,
    });
    return mapOAuthRouteError(err, "oauth.token");
  }
}
