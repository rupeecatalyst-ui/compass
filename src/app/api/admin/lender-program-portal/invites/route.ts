/**
 * CO-LEND-001 / CO-MASTER-005A — Admin: list / create program portal invites.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { assertPortalAdministrator } from "@/lib/lender-program-portal/launch-closure";
import { lenderProgramPortalService } from "@server/services/lender-program-portal/lender-program-portal.service";

function guard() {
  if (!isEnterprisePersistencePrisma()) {
    throw Object.assign(new Error("Requires ENTERPRISE_PERSISTENCE_MODE=prisma"), {
      statusCode: 503,
      code: "PERSISTENCE_REQUIRED",
    });
  }
}

export async function GET(request: Request) {
  try {
    guard();
    const actor = requireAccessToken(request);
    assertPortalAdministrator(actor.role);
    const url = new URL(request.url);
    const matrixLenderId = url.searchParams.get("matrixLenderId")?.trim();
    if (matrixLenderId) {
      const products =
        await lenderProgramPortalService.listMatrixProductsForLender(matrixLenderId);
      return successResponse({ products });
    }
    const items = await lenderProgramPortalService.listInvites();
    return successResponse({ items });
  } catch (err) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    if (e.statusCode === 401) return fromAuthError(err as never);
    return errorResponse(
      e.statusCode || 500,
      e.code || "LENDER_PROGRAM_PORTAL_ERROR",
      e.message || "Failed to list invites",
    );
  }
}

export async function POST(request: Request) {
  try {
    guard();
    const actor = requireAccessToken(request);
    assertPortalAdministrator(actor.role);
    const body = (await request.json()) as {
      lenderId?: string;
      productIds?: string[];
      recipientEmail?: string;
      ttlDays?: number;
      maxUses?: number | null;
      notes?: string;
    };
    if (!body.lenderId?.trim()) {
      return errorResponse(400, "VALIDATION", "lenderId is required");
    }
    if (!body.recipientEmail?.trim()) {
      return errorResponse(400, "RECIPIENT_EMAIL_REQUIRED", "A lender recipient email is required");
    }
    if (!Array.isArray(body.productIds) || body.productIds.length === 0) {
      return errorResponse(
        400,
        "PRODUCT_REQUIRED",
        "Select at least one product for the invitation",
      );
    }
    const invite = await lenderProgramPortalService.createInvite({
      lenderId: body.lenderId.trim(),
      productIds: body.productIds,
      recipientEmail: body.recipientEmail.trim(),
      ttlDays: body.ttlDays,
      maxUses: body.maxUses,
      notes: body.notes,
      actorUserId: actor.userId,
      actorName: actor.email || actor.userId,
      actorRole: actor.role,
    });
    return successResponse(invite, 201);
  } catch (err) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    if (e.statusCode === 401) return fromAuthError(err as never);
    return errorResponse(
      e.statusCode || 500,
      e.code || "LENDER_PROGRAM_PORTAL_ERROR",
      e.message || "Failed to create invite",
    );
  }
}
