/**
 * CO-C1-OPERATIONAL-EMAIL-001B — Controlled SMTP connectivity probe (no outbound mail).
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { ENCE_EXTERNAL_DELIVERY_ENABLED } from "@/constants/enterprise-notification-communication-engine";
import type { EnterpriseCommunicationProfileCode } from "@/types/enterprise-communication-center";
import {
  enterpriseCommunicationCenterService,
  EccError,
} from "@server/services/enterprise-communication-center/ecc.service";
import { probeSmtpProfile } from "@server/services/enterprise-communication-center/smtp-probe.service";

function mapError(err: unknown) {
  if (err instanceof EccError) {
    return errorResponse(err.statusCode, err.code, err.message);
  }
  const mapped = err as { status?: number; body?: unknown };
  if (mapped.status && mapped.body) {
    return fromAuthError(mapped as { status: number; body: never });
  }
  const message = err instanceof Error ? err.message : "SMTP probe failed";
  return errorResponse(400, "ECC_SMTP_PROBE_ERROR", message);
}

export async function POST(request: Request) {
  try {
    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(503, "PERSISTENCE_REQUIRED", "Requires prisma persistence");
    }
    const actor = requireAccessToken(request);
    if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
      return errorResponse(403, "FORBIDDEN", "Admin role required");
    }

    const body = await request.json().catch(() => ({}));
    const profileCode = String(body.profileCode || "CUSTOMERS") as EnterpriseCommunicationProfileCode;

    if (profileCode !== "CUSTOMERS") {
      return errorResponse(
        400,
        "PROFILE_NOT_ALLOWED",
        "Controlled SMTP probe is limited to the CUSTOMERS operational profile.",
      );
    }

    const profiles = await enterpriseCommunicationCenterService.listProfiles();
    const profile = profiles.find((p) => p.profileCode === profileCode);
    if (!profile) {
      return errorResponse(404, "PROFILE_NOT_FOUND", `Profile ${profileCode} not found`);
    }

    const result = await probeSmtpProfile(profile);

    return successResponse({
      mode: "connectivity_probe",
      productionSendingEnabled: ENCE_EXTERNAL_DELIVERY_ENABLED,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    return mapError(err);
  }
}
