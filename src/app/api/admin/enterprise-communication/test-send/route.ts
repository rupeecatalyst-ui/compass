/**
 * CO-C1-OPERATIONAL-EMAIL-001 — Controlled operational test email.
 * Uses ENCE simulation only while external delivery remains disabled.
 * Does not enable Marketing or production-wide sending.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { ENCE_EXTERNAL_DELIVERY_ENABLED } from "@/constants/enterprise-notification-communication-engine";
import {
  enterpriseCommunicationCenterService,
  EccError,
} from "@server/services/enterprise-communication-center/ecc.service";
import { simulateEnceCommunication } from "@/lib/enterprise-notification-communication-engine";
import type { EnterpriseCommunicationProfileCode } from "@/types/enterprise-communication-center";

function mapError(err: unknown) {
  if (err instanceof EccError) {
    return errorResponse(err.statusCode, err.code, err.message);
  }
  const mapped = err as { status?: number; body?: unknown };
  if (mapped.status && mapped.body) {
    return fromAuthError(mapped as { status: number; body: never });
  }
  const message = err instanceof Error ? err.message : "Test send failed";
  return errorResponse(400, "ECC_TEST_SEND_ERROR", message);
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
    const recipientEmail = String(body.recipientEmail || "")
      .trim()
      .toLowerCase();
    const profileCode = String(body.profileCode || "CUSTOMERS") as EnterpriseCommunicationProfileCode;

    if (!recipientEmail || !recipientEmail.includes("@")) {
      return errorResponse(400, "RECIPIENT_REQUIRED", "A valid test recipient email is required");
    }

    const identity = await enterpriseCommunicationCenterService.resolveIdentity({
      profileCode,
    });

    if (!identity.active) {
      return errorResponse(
        400,
        "PROFILE_INACTIVE",
        `Communication profile ${profileCode} is inactive`,
      );
    }

    const timestamp = new Date().toISOString();

    // Hard gate: never live-send from this activation screen.
    if (ENCE_EXTERNAL_DELIVERY_ENABLED) {
      return errorResponse(
        503,
        "LIVE_TEST_NOT_WIRED",
        "Live operational delivery is not wired for test-send in this build. Keep ENCE external delivery off until a dedicated live connector sprint.",
      );
    }

    const simulation = simulateEnceCommunication({
      channel: "email",
      recipientRef: recipientEmail,
      contextRef: `ecc-test-send:${profileCode}`,
      payload: {
        kind: "operational_email_test",
        profileCode,
        fromDisplayName: identity.displayName,
        fromEmail: identity.senderEmail,
        replyTo: identity.replyToEmail,
        subject: "Catalyst One — Operational Email Configuration Test",
      },
      simulatedBy: actor.userId || actor.email || "admin",
    });

    return successResponse({
      mode: "simulation",
      productionSendingEnabled: false,
      status: "success",
      deliveryStatus: simulation.status,
      timestamp,
      recipientEmail,
      profileCode,
      senderDisplayName: identity.displayName,
      senderEmail: identity.senderEmail,
      providerResponse: {
        message:
          "Test recorded as ENCE simulation only. Operational production email remains OFF.",
        simulationId: simulation.id,
        warning: simulation.warning ?? null,
      },
      error: null,
    });
  } catch (err) {
    return mapError(err);
  }
}
