import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { lenderRegistryService } from "@server/services/lender-registry/lender-registry.service";
import {
  lenderRegistryPersistenceGuard,
  mapRouteError,
  notFound,
  requireLenderRegistryAdmin,
} from "../../../_lib/route-utils";

type RouteContext = { params: Promise<{ programId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    lenderRegistryPersistenceGuard();
    const actor = requireAccessToken(request);
    requireLenderRegistryAdmin(actor);
    const { programId } = await context.params;
    const history = await lenderRegistryService.listProgramHistory(programId);
    return successResponse(history);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped.status === 401 || mapped.status === 403) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Failed to read programme history";
    if (message.includes("not found")) return notFound("Lender program not found");
    return errorResponse(400, "LENDER_PROGRAM_HISTORY_FAILED", message);
  }
}
