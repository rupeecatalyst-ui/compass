import { NextResponse } from "next/server";
import { approveOAuthConsent } from "@server/services/chatgpt-integration/chatgpt-oauth.service";
import { successResponse } from "@/lib/api/auth-route-utils";
import { mapOAuthRouteError } from "@/lib/chatgpt-integration/oauth-route-utils";
import { createCorrelationId } from "@/lib/ops/correlation";
import { recordBusinessAudit } from "@/lib/ops/record";
import { CHATGPT_INTEGRATION_MODULE } from "@/lib/chatgpt-integration/constants";

type ConsentBody = {
  requestId?: string;
};

/** Employee session approves OAuth consent and returns redirect URL with authorization code. */
export async function POST(request: Request): Promise<NextResponse> {
  const correlationId = createCorrelationId();
  const auth = request.headers.get("authorization");
  const employeeToken = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!employeeToken) {
    return mapOAuthRouteError(
      Object.assign(new Error("Employee session required for OAuth consent."), {
        statusCode: 401,
        code: "INVALID_EMPLOYEE_SESSION",
      }),
      "oauth.consent",
    );
  }

  let body: ConsentBody;
  try {
    body = (await request.json()) as ConsentBody;
  } catch {
    return mapOAuthRouteError(
      Object.assign(new Error("Invalid JSON body."), { statusCode: 400, code: "INVALID_BODY" }),
      "oauth.consent",
    );
  }

  const requestId = body.requestId?.trim() ?? "";
  if (!requestId) {
    return mapOAuthRouteError(
      Object.assign(new Error("Missing requestId."), { statusCode: 400, code: "INVALID_OAUTH_REQUEST" }),
      "oauth.consent",
    );
  }

  try {
    const result = await approveOAuthConsent({ requestId, employeeAccessToken: employeeToken });
    recordBusinessAudit({
      actorUserId: null,
      module: CHATGPT_INTEGRATION_MODULE,
      action: "oauth.consent.approved",
      entityId: requestId,
      previousValue: null,
      newValue: "authorization_code_issued",
      result: "Success",
      correlationId,
    });
    return successResponse(result, 200, correlationId);
  } catch (err) {
    recordBusinessAudit({
      actorUserId: null,
      module: CHATGPT_INTEGRATION_MODULE,
      action: "oauth.consent.denied",
      entityId: requestId,
      previousValue: null,
      newValue: err instanceof Error ? err.message : "denied",
      result: "Failure",
      correlationId,
    });
    return mapOAuthRouteError(err, "oauth.consent");
  }
}
