/**
 * CO-C1-COMMUNICATION-002 — IMAP Test Connection (admin).
 * AUTH + open mailbox only. Never returns or logs the IMAP password.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { isInboundImapPasswordConfigured } from "@/lib/enterprise-inbound-email/imap-secret-resolver";
import { probeInboundImapConnection } from "@server/services/enterprise-inbound-email/imap-mailbox.service";
import { inboundEmailServerConfigService } from "@server/services/enterprise-inbound-email/inbound-email-server-config.service";
import type { InboundEmailImapProbeResult } from "@/types/enterprise-inbound-email";

export async function POST(request: Request) {
  try {
    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(503, "PERSISTENCE_REQUIRED", "Requires prisma persistence");
    }
    const actor = requireAccessToken(request);
    if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
      return errorResponse(
        403,
        "FORBIDDEN",
        "Admin role required for IMAP connection test.",
      );
    }

    const runtime = await inboundEmailServerConfigService.resolveRuntimeImapConfig({
      requireEnabled: false,
    });
    const passwordConfigured = isInboundImapPasswordConfigured();

    if (!runtime.imap) {
      const settings = await inboundEmailServerConfigService.getSettingsDto();
      const result: InboundEmailImapProbeResult = {
        ok: false,
        host: settings.imapHost,
        port: settings.imapPort,
        mailbox: settings.mailbox,
        tlsConnected: false,
        authVerified: false,
        mailboxOpened: false,
        passwordConfigured,
        message: passwordConfigured
          ? "IMAP host/username incomplete. Save Incoming Email Server settings first."
          : "IMAP password is not configured on the host (INBOUND_EMAIL_IMAP_PASSWORD).",
      };
      await inboundEmailServerConfigService.recordProbeResult(result);
      return successResponse({ result });
    }

    const probe = await probeInboundImapConnection(runtime.imap);
    const result: InboundEmailImapProbeResult = {
      ok: probe.ok,
      host: runtime.imap.host,
      port: runtime.imap.port,
      mailbox: runtime.imap.mailbox,
      tlsConnected: probe.tlsConnected,
      authVerified: probe.authVerified,
      mailboxOpened: probe.mailboxOpened,
      passwordConfigured,
      message: probe.message,
    };
    await inboundEmailServerConfigService.recordProbeResult(result);
    return successResponse({ result });
  } catch (err) {
    const mapped = err as { status?: number; body?: unknown; statusCode?: number };
    if (mapped.status && mapped.body) return fromAuthError(mapped as { status: number; body: never });
    return errorResponse(
      mapped.statusCode ?? 500,
      "INBOUND_IMAP_PROBE_FAILED",
      err instanceof Error ? err.message : "IMAP probe failed",
    );
  }
}
