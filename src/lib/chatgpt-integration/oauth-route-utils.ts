/**
 * CO-CHATGPT-OAUTH-001 — OAuth route error mapping.
 */
import { errorResponse } from "@/lib/api/auth-route-utils";
import { createCorrelationId } from "@/lib/ops/correlation";
import { CHATGPT_INTEGRATION_MODULE } from "@/lib/chatgpt-integration/constants";

export function mapOAuthRouteError(
  err: unknown,
  action: string,
): ReturnType<typeof errorResponse> {
  const requestId = createCorrelationId();
  const status =
    err && typeof err === "object" && "statusCode" in err
      ? Number((err as { statusCode?: number }).statusCode) || 500
      : 500;
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: string }).code)
      : "OAUTH_ERROR";
  const message = err instanceof Error ? err.message : "OAuth request failed.";
  return errorResponse(status, code, message, undefined, {
    correlationId: requestId,
    module: CHATGPT_INTEGRATION_MODULE,
    action,
  });
}
