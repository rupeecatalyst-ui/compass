/**
 * CO-MARKETING-REDESIGN-010 — Marketing-only NextResponse mapper.
 * Does not change global authentication architecture.
 */

import "server-only";

import { errorResponse, fromAuthError } from "@/lib/api/auth-route-utils";
import { EnterpriseMarketingSafetyError } from "@/lib/enterprise-marketing-engine/safety";
import { mapMarketingUnknownError } from "@/lib/enterprise-marketing-engine/api-error-map";

export function fromMarketingUnknownError(
  err: unknown,
  fallbackCode: string,
  fallbackMessage: string,
) {
  if (err instanceof EnterpriseMarketingSafetyError) {
    return errorResponse(403, err.code, err.message);
  }
  const mapped = mapMarketingUnknownError(err, fallbackCode, fallbackMessage);
  if (mapped.authBody) {
    return fromAuthError({ status: mapped.status, body: mapped.authBody });
  }
  return errorResponse(mapped.status, mapped.code, mapped.message);
}
