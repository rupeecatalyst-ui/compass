import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { invoicePartyService } from "@server/services/invoice-party";

function guard() {
  if (!isEnterprisePersistencePrisma()) {
    throw Object.assign(new Error("Invoice Party Master requires prisma persistence"), {
      status: 503,
      body: {
        success: false,
        error: {
          code: "PERSISTENCE_MODE_REQUIRED",
          message: "Accounting Invoice Party Master requires ENTERPRISE_PERSISTENCE_MODE=prisma",
        },
      } satisfies ApiResponse<unknown>,
    });
  }
}

export async function GET(request: Request) {
  try {
    guard();
    requireAccessToken(request);
    const url = new URL(request.url);
    const result = await invoicePartyService.list({
      q: url.searchParams.get("q") ?? undefined,
      activeOnly: url.searchParams.get("activeOnly") === "true",
      enabled:
        url.searchParams.get("enabled") === "true"
          ? true
          : url.searchParams.get("enabled") === "false"
            ? false
            : undefined,
    });
    return successResponse(result);
  } catch (err) {
    if (typeof err === "object" && err && "status" in err && "body" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Failed to list invoice parties";
    return errorResponse(500, "INVOICE_PARTY_LIST_FAILED", message);
  }
}

export async function POST(request: Request) {
  try {
    guard();
    const actor = requireAccessToken(request);
    const body = (await request.json()) as Record<string, unknown>;
    const created = await invoicePartyService.create(body, actor.userId);
    return successResponse(created, 201);
  } catch (err) {
    if (typeof err === "object" && err && "status" in err && "body" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const status =
      typeof err === "object" && err && "status" in err
        ? Number((err as { status: number }).status)
        : 500;
    const message = err instanceof Error ? err.message : "Failed to create invoice party";
    return errorResponse(status || 500, "INVOICE_PARTY_CREATE_FAILED", message);
  }
}
