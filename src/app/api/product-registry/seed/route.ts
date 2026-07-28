/**
 * CO-ADMIN-005 — Seed / refresh Product + Lender Tier-2 masters (idempotent).
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { seedTier2Registries } from "@server/services/tier2-registry/seed-tier2-registries.service";
import {
  mapRouteError,
  productRegistryPersistenceGuard,
  requireProductRegistryAdmin,
} from "../_lib/route-utils";

export async function POST(request: Request) {
  try {
    productRegistryPersistenceGuard();
    const actor = requireAccessToken(request);
    requireProductRegistryAdmin(actor);
    const result = await seedTier2Registries();
    return successResponse(result);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped.status === 401 || mapped.status === 403) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Failed to seed product master";
    return errorResponse(500, "PRODUCT_SEED_FAILED", message);
  }
}
