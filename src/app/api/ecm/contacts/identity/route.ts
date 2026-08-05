/**
 * CO-CONTACT-IDENTITY-001 — Resolve Contact identity by mobile before create.
 * GET /api/ecm/contacts/identity?mobile=
 */

import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { configureEcmPersistencePorts } from "@/lib/enterprise-persistence/server";
import { ecmContactService } from "@server/services/ecm/contact.service";
import type { ApiResponse } from "@/types/api";

function persistenceGuard() {
  if (!isEnterprisePersistencePrisma()) {
    throw new Error("ECM REST API requires ENTERPRISE_PERSISTENCE_MODE=prisma");
  }
}

export async function GET(request: Request) {
  try {
    persistenceGuard();
    configureEcmPersistencePorts();
    requireAccessToken(request);
    const url = new URL(request.url);
    const mobile = url.searchParams.get("mobile") ?? "";
    const result = await ecmContactService.resolveIdentityByMobile(mobile);
    return successResponse(result);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Failed to resolve contact identity";
    return errorResponse(500, "ECM_IDENTITY_LOOKUP_FAILED", message);
  }
}
