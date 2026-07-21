import {
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { referenceMasterService } from "@server/services/reference-master/reference-master.service";
import {
  mapRouteError,
  referenceMasterPersistenceGuard,
} from "../_lib/route-utils";

export async function GET(request: Request) {
  try {
    referenceMasterPersistenceGuard();
    requireAccessToken(request);
    const domains = await referenceMasterService.listDomains();
    return successResponse({ domains });
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped.status === 401) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return fromAuthError({
      status: 500,
      body: {
        success: false,
        error: {
          code: "REF_MASTER_DOMAINS_FAILED",
          message: err instanceof Error ? err.message : "Failed to list domains",
        },
      },
    });
  }
}
