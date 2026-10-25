import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import {
  enterpriseCommunicationCenterService,
  EccError,
} from "@server/services/enterprise-communication-center/ecc.service";
import type {
  EnterpriseCommunicationEventType,
  EnterpriseCommunicationProfileCode,
} from "@/types/enterprise-communication-center";

function mapError(err: unknown) {
  if (err instanceof EccError) {
    return errorResponse(err.statusCode, err.code, err.message);
  }
  const mapped = err as { status?: number; body?: unknown };
  if (mapped.status && mapped.body) {
    return fromAuthError(mapped as { status: number; body: never });
  }
  const message = err instanceof Error ? err.message : "ECC failure";
  return errorResponse(400, "ECC_ERROR", message);
}

function guard() {
  if (!isEnterprisePersistencePrisma()) {
    throw new EccError(
      "Enterprise Communication Center requires ENTERPRISE_PERSISTENCE_MODE=prisma",
      "PERSISTENCE_REQUIRED",
      503,
    );
  }
}

/** GET profiles + event mappings */
export async function GET(request: Request) {
  try {
    guard();
    requireAccessToken(request);
    const url = new URL(request.url);
    if (url.searchParams.get("view") === "events") {
      return successResponse({
        events: await enterpriseCommunicationCenterService.getEventMappings(),
      });
    }
    const profiles = await enterpriseCommunicationCenterService.listProfiles();
    const events = await enterpriseCommunicationCenterService.getEventMappings();
    return successResponse({ profiles, events });
  } catch (err) {
    return mapError(err);
  }
}

/** POST resolve identity by eventType or profileCode */
export async function POST(request: Request) {
  try {
    guard();
    const actor = requireAccessToken(request);
    const body = await request.json();
    if (body.smtpPassword || body.password || body.apiKey) {
      return errorResponse(400, "SECRETS_NOT_ALLOWED", "SMTP credentials cannot be submitted via API.");
    }
    if (body.action === "create_mailbox" || body.action === "register_sender") {
      if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
        return errorResponse(403, "FORBIDDEN", "Admin role required");
      }
      if (body.action === "register_sender") {
        const identity = await enterpriseCommunicationCenterService.registerSender(
          String(body.profileCode ?? ""),
          actor.userId,
        );
        return successResponse({ identity });
      }
      const created = await enterpriseCommunicationCenterService.createMailbox({
        displayName: String(body.displayName ?? ""),
        senderEmail: String(body.senderEmail ?? ""),
        replyToEmail: body.replyToEmail ? String(body.replyToEmail) : null,
        smtpHost: String(body.smtpHost ?? ""),
        smtpPort: Number(body.smtpPort),
        smtpUsername: String(body.smtpUsername ?? ""),
        modifiedBy: actor.userId,
      });
      return successResponse(created);
    }
    if (body.eventType) {
      const identity = await enterpriseCommunicationCenterService.resolveIdentity({
        eventType: String(body.eventType) as EnterpriseCommunicationEventType,
      });
      return successResponse(identity);
    }
    if (body.profileCode) {
      const identity = await enterpriseCommunicationCenterService.resolveIdentity({
        profileCode: String(body.profileCode) as EnterpriseCommunicationProfileCode,
      });
      return successResponse(identity);
    }
    return errorResponse(400, "RESOLVE_INPUT_REQUIRED", "eventType or profileCode required");
  } catch (err) {
    return mapError(err);
  }
}
