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
import { ensureWealthPartnerInvitationAdapterRegistered } from "@server/services/invitation-engine/wealth-partner-adapter";
import { resolveActorDisplayName } from "@/app/api/wealth-partner-registry/_lib/route-utils";
import type { EnterpriseInvitationInviteeKind } from "@/types/enterprise-invitation-engine";

function mapError(err: unknown) {
  if (err instanceof InvitationEngineError) {
    return errorResponse(err.statusCode, err.code, err.message);
  }
  const mapped = err as { status?: number; body?: unknown; message?: string };
  if (mapped.status && mapped.body) {
    return fromAuthError(mapped as { status: number; body: never });
  }
  const message = err instanceof Error ? err.message : "Invitation engine failure";
  return errorResponse(400, "INVITATION_ENGINE_ERROR", message);
}

function persistenceGuard() {
  if (!isEnterprisePersistencePrisma()) {
    throw new InvitationEngineError(
      "Enterprise Invitation Engine requires ENTERPRISE_PERSISTENCE_MODE=prisma",
      "PERSISTENCE_REQUIRED",
      503,
    );
  }
}

function originFrom(request: Request) {
  try {
    return new URL(request.url).origin;
  } catch {
    return undefined;
  }
}

/** GET current invitation state for an entity */
export async function GET(request: Request) {
  try {
    persistenceGuard();
    ensureWealthPartnerInvitationAdapterRegistered();
    const actor = requireAccessToken(request);
    const url = new URL(request.url);
    const inviteeKind = (url.searchParams.get("inviteeKind") ||
      "wealth_partner") as EnterpriseInvitationInviteeKind;
    const entityId = url.searchParams.get("entityId") || "";
    if (!entityId) {
      return errorResponse(400, "ENTITY_REQUIRED", "entityId is required");
    }
    const state = await invitationEngineService.getEntityInvitationState(
      inviteeKind,
      entityId,
    );
    return successResponse(state);
  } catch (err) {
    return mapError(err);
  }
}

/** POST actions: generate | send | resend | cancel */
export async function POST(request: Request) {
  try {
    persistenceGuard();
    ensureWealthPartnerInvitationAdapterRegistered();
    const actor = requireAccessToken(request);
    const actorLabel =
      (await resolveActorDisplayName(actor.userId)) || actor.userId;
    const body = await request.json();
    const action = String(body.action || "");
    const inviteeKind = (body.inviteeKind ||
      "wealth_partner") as EnterpriseInvitationInviteeKind;
    const entityId = String(body.entityId || "");
    if (!entityId) {
      return errorResponse(400, "ENTITY_REQUIRED", "entityId is required");
    }
    const origin = originFrom(request);

    if (action === "generate") {
      const result = await invitationEngineService.generateLink({
        inviteeKind,
        entityId,
        actorUserId: actor.userId,
        actorLabel,
        ttlDays: body.ttlDays ? Number(body.ttlDays) : undefined,
        origin,
      });
      return successResponse(result);
    }

    if (action === "send" || action === "resend") {
      const result = await invitationEngineService.sendInvitation({
        inviteeKind,
        entityId,
        actorUserId: actor.userId,
        actorLabel,
        origin,
        resend: action === "resend",
      });
      return successResponse(result);
    }

    if (action === "cancel") {
      const result = await invitationEngineService.cancelInvitation({
        inviteeKind,
        entityId,
        actorUserId: actor.userId,
        actorLabel,
      });
      return successResponse(result);
    }

    return errorResponse(400, "UNKNOWN_ACTION", "action must be generate|send|resend|cancel");
  } catch (err) {
    return mapError(err);
  }
}
