/**
 * One live test email from a stored ECC mailbox.
 * Does not seed profiles, enable ENCE, or retry an ambiguous submission.
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
import {
  assessEccLiveTestRequest,
  runEccLiveTestEmail,
} from "@server/services/enterprise-communication-center/ecc-live-test-email.service";
import { enterpriseActivityService } from "@server/services/enterprise-activity/enterprise-activity.service";

function mapError(err: unknown) {
  if (err instanceof EccError) {
    return errorResponse(err.statusCode, err.code, err.message);
  }
  const mapped = err as { status?: number; body?: unknown };
  if (mapped.status && mapped.body) {
    return fromAuthError(mapped as { status: number; body: never });
  }
  const message = err instanceof Error ? err.message : "Live test failed";
  return errorResponse(400, "ECC_LIVE_TEST_ERROR", message);
}

export async function POST(request: Request) {
  try {
    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(503, "PERSISTENCE_REQUIRED", "Requires prisma persistence");
    }
    const actor = requireAccessToken(request);
    const body = await request.json().catch(() => ({}));
    const assessed = assessEccLiveTestRequest({
      role: actor.role,
      confirmationPhrase: body.confirmationPhrase,
      recipientEmail: body.recipientEmail,
    });
    if (!assessed.ok) {
      const status = assessed.code === "FORBIDDEN" ? 403 : 400;
      return errorResponse(status, assessed.code, assessed.message);
    }
    const profileCode = String(body.profileCode || "").trim();
    const profile = await enterpriseCommunicationCenterService.getStoredProfile(profileCode);
    if (!profile) {
      return errorResponse(404, "PROFILE_NOT_FOUND", "That communication profile is not configured.");
    }
    const timestamp = new Date().toISOString();
    const result = await runEccLiveTestEmail({
      profile,
      recipientEmail: assessed.recipientEmail,
    });
    try {
      await enterpriseActivityService.emit({
        eventKind: "communications",
        sourceSystem: "org",
        sourceEventId: `ecc-live-test:${timestamp}:${assessed.recipientEmail}`,
        title: `ECC live test ${result.outcome}`,
        summary: `${result.senderEmail ?? profile.senderEmail} → ${assessed.recipientEmail} · ${result.outcome}`,
        payload: {
          kind: "ecc_live_test",
          outcome: result.outcome,
          delivered: false,
          profileCode: profile.profileCode,
          senderEmail: result.senderEmail,
          recipientEmail: assessed.recipientEmail,
          enceExternalDeliveryEnabled: ENCE_EXTERNAL_DELIVERY_ENABLED,
        },
        actorUserId: actor.userId ?? null,
        actorName: actor.email ?? null,
        occurredAt: timestamp,
      });
    } catch {
      /* The provider result is still returned. Audit failure does not send again. */
    }
    return successResponse({
      mode: "live_test",
      outcome: result.outcome,
      delivered: false,
      productionSendingEnabled: false,
      enceExternalDeliveryEnabled: ENCE_EXTERNAL_DELIVERY_ENABLED,
      timestamp,
      profileCode: profile.profileCode,
      senderEmail: result.senderEmail,
      recipientEmail: assessed.recipientEmail,
      message: result.message,
    });
  } catch (err) {
    return mapError(err);
  }
}
