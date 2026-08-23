/**
 * CO-C1-COMMUNICATION-002 — Incoming Email Server settings (admin).
 * Non-secret IMAP fields in DB; password remains host env only.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { inboundEmailServerConfigService } from "@server/services/enterprise-inbound-email/inbound-email-server-config.service";

function requireAdmin(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(
      new Error("Admin role required for Incoming Email Server settings."),
      { statusCode: 403, code: "FORBIDDEN" },
    );
  }
}

export async function GET(request: Request) {
  try {
    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(503, "PERSISTENCE_REQUIRED", "Requires prisma persistence");
    }
    const actor = requireAccessToken(request);
    requireAdmin(actor);
    const settings = await inboundEmailServerConfigService.getSettingsDto();
    return successResponse({ settings });
  } catch (err) {
    const mapped = err as { status?: number; body?: unknown; statusCode?: number };
    if (mapped.status && mapped.body) return fromAuthError(mapped as { status: number; body: never });
    return errorResponse(
      mapped.statusCode ?? 500,
      "INBOUND_SERVER_SETTINGS_GET_FAILED",
      err instanceof Error ? err.message : "Failed to load Incoming Email Server settings",
    );
  }
}

export async function PUT(request: Request) {
  try {
    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(503, "PERSISTENCE_REQUIRED", "Requires prisma persistence");
    }
    const actor = requireAccessToken(request);
    requireAdmin(actor);

    const body = await request.json().catch(() => ({}));
    const settings = await inboundEmailServerConfigService.upsertSettings({
      enabled: Boolean(body.enabled),
      imapHost: body.imapHost != null ? String(body.imapHost) : null,
      imapPort: Number(body.imapPort ?? 993),
      imapUsername: body.imapUsername != null ? String(body.imapUsername) : null,
      mailbox: String(body.mailbox || "INBOX"),
      internalDomains: String(body.internalDomains || "rupeecatalyst.com"),
      actorUserId: actor.userId,
    });

    return successResponse({ settings });
  } catch (err) {
    const mapped = err as { status?: number; body?: unknown; statusCode?: number };
    if (mapped.status && mapped.body) return fromAuthError(mapped as { status: number; body: never });
    return errorResponse(
      mapped.statusCode ?? 500,
      "INBOUND_SERVER_SETTINGS_SAVE_FAILED",
      err instanceof Error ? err.message : "Failed to save Incoming Email Server settings",
    );
  }
}
