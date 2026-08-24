import { NextResponse } from "next/server";
import { describeOAuthPendingRequest } from "@server/services/chatgpt-integration/chatgpt-oauth.service";
import { successResponse } from "@/lib/api/auth-route-utils";
import { mapOAuthRouteError } from "@/lib/chatgpt-integration/oauth-route-utils";
import { createCorrelationId } from "@/lib/ops/correlation";

/** Consent UI metadata for a pending OAuth request (no secrets). */
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const requestId = url.searchParams.get("request")?.trim() ?? "";
  if (!requestId) {
    return mapOAuthRouteError(
      Object.assign(new Error("Missing OAuth request id."), {
        statusCode: 400,
        code: "INVALID_OAUTH_REQUEST",
      }),
      "oauth.request",
    );
  }
  try {
    const data = describeOAuthPendingRequest(requestId);
    return successResponse(data, 200, createCorrelationId());
  } catch (err) {
    return mapOAuthRouteError(err, "oauth.request");
  }
}
