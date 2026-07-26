import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { invoicePartyService } from "@server/services/invoice-party";

type Ctx = { params: Promise<{ partyId: string }> };

function guard() {
  if (!isEnterprisePersistencePrisma()) {
    throw Object.assign(new Error("Invoice Party Master requires prisma persistence"), {
      status: 503,
      body: {
        success: false,
        error: { code: "PERSISTENCE_MODE_REQUIRED", message: "Prisma persistence required" },
      } satisfies ApiResponse<unknown>,
    });
  }
}

export async function GET(request: Request, context: Ctx) {
  try {
    guard();
    requireAccessToken(request);
    const { partyId } = await context.params;
    const row = await invoicePartyService.get(partyId);
    return successResponse(row);
  } catch (err) {
    if (typeof err === "object" && err && "status" in err && "body" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const status =
      typeof err === "object" && err && "status" in err
        ? Number((err as { status: number }).status)
        : 500;
    const message = err instanceof Error ? err.message : "Failed to load invoice party";
    return errorResponse(status || 500, "INVOICE_PARTY_GET_FAILED", message);
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    guard();
    const actor = requireAccessToken(request);
    const { partyId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const row = await invoicePartyService.update(partyId, body, actor.userId);
    return successResponse(row);
  } catch (err) {
    if (typeof err === "object" && err && "status" in err && "body" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Failed to update invoice party";
    return errorResponse(500, "INVOICE_PARTY_UPDATE_FAILED", message);
  }
}
