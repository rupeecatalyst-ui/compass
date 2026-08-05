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
  EnterpriseCommunicationProfileCode,
  EnterpriseCommunicationSmtpProvider,
} from "@/types/enterprise-communication-center";

type RouteContext = { params: Promise<{ profileCode: string }> };

function mapError(err: unknown) {
  if (err instanceof EccError) {
    return errorResponse(err.statusCode, err.code, err.message);
  }
  const mapped = err as { status?: number; body?: unknown };
  if (mapped.status && mapped.body) {
    return fromAuthError(mapped as { status: number; body: never });
  }
  const message = err instanceof Error ? err.message : "ECC update failed";
  return errorResponse(400, "ECC_UPDATE_ERROR", message);
}

/** PATCH a Communication Profile (admin). */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(503, "PERSISTENCE_REQUIRED", "Requires prisma persistence");
    }
    const actor = requireAccessToken(request);
    if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
      return errorResponse(403, "FORBIDDEN", "Admin role required");
    }
    const { profileCode } = await context.params;
    const body = await request.json();
    const updated = await enterpriseCommunicationCenterService.updateProfile(
      profileCode as EnterpriseCommunicationProfileCode,
      {
        displayName: body.displayName !== undefined ? String(body.displayName) : undefined,
        senderEmail: body.senderEmail !== undefined ? String(body.senderEmail) : undefined,
        replyToEmail:
          body.replyToEmail === undefined
            ? undefined
            : body.replyToEmail
              ? String(body.replyToEmail)
              : null,
        smtpProvider:
          body.smtpProvider !== undefined
            ? (String(body.smtpProvider) as EnterpriseCommunicationSmtpProvider)
            : undefined,
        smtpHost:
          body.smtpHost === undefined
            ? undefined
            : body.smtpHost
              ? String(body.smtpHost)
              : null,
        smtpPort:
          body.smtpPort === undefined || body.smtpPort === null || body.smtpPort === ""
            ? body.smtpPort === undefined
              ? undefined
              : null
            : Number(body.smtpPort),
        smtpUsername:
          body.smtpUsername === undefined
            ? undefined
            : body.smtpUsername
              ? String(body.smtpUsername)
              : null,
        smtpPassword:
          body.smtpPassword === undefined
            ? undefined
            : body.smtpPassword
              ? String(body.smtpPassword)
              : null,
        signature:
          body.signature === undefined
            ? undefined
            : body.signature
              ? String(body.signature)
              : null,
        footer:
          body.footer === undefined ? undefined : body.footer ? String(body.footer) : null,
        logoUrl:
          body.logoUrl === undefined ? undefined : body.logoUrl ? String(body.logoUrl) : null,
        supportEmail:
          body.supportEmail === undefined
            ? undefined
            : body.supportEmail
              ? String(body.supportEmail)
              : null,
        supportPhone:
          body.supportPhone === undefined
            ? undefined
            : body.supportPhone
              ? String(body.supportPhone)
              : null,
        usedFor: Array.isArray(body.usedFor) ? body.usedFor.map(String) : undefined,
        active: body.active !== undefined ? Boolean(body.active) : undefined,
        modifiedBy: actor.userId,
      },
    );
    return successResponse(updated);
  } catch (err) {
    return mapError(err);
  }
}
