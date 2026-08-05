/**
 * CO-PROG-004 — Seed baseline Supported Products + Commercial Programs (create-missing).
 * Admin-only. No auto-sync. Does not overwrite administrator commercial edits.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { seedBaselineCommercialPrograms } from "@server/services/tier2-registry/seed-baseline-commercial-programs.service";
import {
  lenderRegistryPersistenceGuard,
  mapRouteError,
  requireLenderRegistryAdmin,
} from "../_lib/route-utils";

export async function POST(request: Request) {
  try {
    lenderRegistryPersistenceGuard();
    const actor = requireAccessToken(request);
    requireLenderRegistryAdmin(actor);
    const result = await seedBaselineCommercialPrograms();
    return successResponse(result);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped.status === 401 || mapped.status === 403) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    const message =
      err instanceof Error ? err.message : "Failed to seed baseline commercial programs";
    return errorResponse(500, "BASELINE_PROGRAM_SEED_FAILED", message);
  }
}
