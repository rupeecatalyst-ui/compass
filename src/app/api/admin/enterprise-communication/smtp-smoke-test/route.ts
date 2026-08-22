/**
 * CO-C1-OPERATIONAL-EMAIL-001C — Super Admin SMTP smoke test.
 * Sends one message to an explicitly entered recipient via CUSTOMERS + Hostinger credential.
 * Does not enable ENCE or unrestricted operational email.
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
import { runCustomersSmtpSmokeTest } from "@server/services/enterprise-communication-center/smtp-smoke-test.service";
import { enterpriseActivityService } from "@server/services/enterprise-activity/enterprise-activity.service";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mapError(err: unknown) {
  if (err instanceof EccError) {
    return errorResponse(err.statusCode, err.code, err.message);
  }
  const mapped = err as { status?: number; body?: unknown };
  if (mapped.status && mapped.body) {
    return fromAuthError(mapped as { status: number; body: never });
  }
  const message = err instanceof Error ? err.message : "SMTP smoke test failed";
  return errorResponse(400, "ECC_SMTP_SMOKE_TEST_ERROR", message);
}

export async function POST(request: Request) {
  try {
    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(503, "PERSISTENCE_REQUIRED", "Requires prisma persistence");
    }

    const actor = requireAccessToken(request);
    if (actor.role !== "SUPER_ADMIN") {
      return errorResponse(
        403,
        "FORBIDDEN",
        "Super Admin role required for SMTP smoke test.",
      );
    }

    if (ENCE_EXTERNAL_DELIVERY_ENABLED) {
      return errorResponse(
        503,
        "SMOKE_TEST_DISABLED",
        "SMTP smoke test is unavailable while ENCE external delivery is enabled.",
      );
    }

    const body = await request.json().catch(() => ({}));
    const recipientEmail = String(body.recipientEmail || "")
      .trim()
      .toLowerCase();
    const profileCode = String(body.profileCode || "CUSTOMERS") as EnterpriseCommunicationProfileCode;

    if (!recipientEmail || !EMAIL_RE.test(recipientEmail)) {
      return errorResponse(
        400,
        "RECIPIENT_REQUIRED",
        "Enter a single valid test recipient email address.",
      );
    }

    if (recipientEmail.includes(",") || recipientEmail.includes(";")) {
      return errorResponse(
        400,
        "RECIPIENT_INVALID",
        "Only one explicit test recipient is allowed.",
      );
    }

    if (profileCode !== "CUSTOMERS") {
      return errorResponse(
        400,
        "PROFILE_NOT_ALLOWED",
        "SMTP smoke test is limited to the CUSTOMERS operational profile.",
      );
    }

    const profiles = await enterpriseCommunicationCenterService.listProfiles();
    const profile = profiles.find((p) => p.profileCode === profileCode);
    if (!profile) {
      return errorResponse(404, "PROFILE_NOT_FOUND", `Profile ${profileCode} not found`);
    }

    const timestamp = new Date().toISOString();
    const result = await runCustomersSmtpSmokeTest({ profile, recipientEmail });

    try {
      await enterpriseActivityService.emit({
        eventKind: "communications",
        sourceSystem: "org",
        sourceEventId: `ecc-smtp-smoke:${timestamp}:${recipientEmail}`,
        title: result.ok
          ? "CUSTOMERS SMTP smoke test passed"
          : "CUSTOMERS SMTP smoke test failed",
        summary: `${recipientEmail} · ${result.message}`,
        payload: {
          kind: "ecc_smtp_smoke_test",
          profileCode: result.profileCode,
          recipientEmail: result.recipientEmail,
          senderEmail: result.senderEmail,
          ok: result.ok,
          host: result.host,
          port: result.port,
          credentialSource: result.credentialSource,
          productionSendingEnabled: false,
          enceExternalDeliveryEnabled: ENCE_EXTERNAL_DELIVERY_ENABLED,
        },
        actorUserId: actor.userId ?? null,
        actorName: actor.email ?? null,
        occurredAt: timestamp,
      });
    } catch {
      /* fail-open — smoke test result still returned to caller */
    }

    return successResponse({
      mode: "smtp_smoke_test",
      productionSendingEnabled: false,
      enceExternalDeliveryEnabled: ENCE_EXTERNAL_DELIVERY_ENABLED,
      timestamp,
      recorded: true,
      ...result,
    });
  } catch (err) {
    return mapError(err);
  }
}
