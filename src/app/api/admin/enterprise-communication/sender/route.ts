import { NextResponse } from "next/server";
import {
  requireAccessToken,
  fromAuthError,
  successResponse,
  errorResponse,
} from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import {
  invitationEngineService,
  InvitationEngineError,
} from "@server/services/invitation-engine/invitation-engine.service";

function mapError(err: unknown) {
  if (err instanceof InvitationEngineError) {
    return errorResponse(err.statusCode, err.code, err.message);
  }
  const mapped = err as { status?: number; body?: unknown };
  if (mapped.status && mapped.body) {
    return fromAuthError(mapped as { status: number; body: never });
  }
  const message = err instanceof Error ? err.message : "Communication config failure";
  return errorResponse(400, "COMM_CONFIG_ERROR", message);
}

/** GET resolved transactional sender (org config → env → seed). */
export async function GET(request: Request) {
  try {
    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(503, "PERSISTENCE_REQUIRED", "Requires prisma persistence");
    }
    requireAccessToken(request);
    const sender = await invitationEngineService.getSenderConfig();
    return successResponse(sender);
  } catch (err) {
    return mapError(err);
  }
}

/** PATCH admin update of Enterprise Communication sender. */
export async function PATCH(request: Request) {
  try {
    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(503, "PERSISTENCE_REQUIRED", "Requires prisma persistence");
    }
    const actor = requireAccessToken(request);
    if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Admin role required" } },
        { status: 403 },
      );
    }
    const body = await request.json();
    const sender = await invitationEngineService.updateSenderConfig({
      displayName: String(body.displayName || ""),
      senderEmail: String(body.senderEmail || ""),
      supportEmail: String(body.supportEmail || body.senderEmail || ""),
      supportPhone: body.supportPhone ? String(body.supportPhone) : null,
      actorUserId: actor.userId,
    });
    return successResponse(sender);
  } catch (err) {
    return mapError(err);
  }
}
