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
    requireAccessToken(request);
    const body = await request.json();
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
