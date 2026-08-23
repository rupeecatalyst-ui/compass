/**
 * CO-C1-COMMUNICATION-002 — Incoming Email Server settings (DB non-secrets + env password).
 */
import "server-only";

import {
  INBOUND_EMAIL_IMAP_PASSWORD_ENV,
  isInboundImapPasswordConfigured,
  resolveInboundImapPassword,
} from "@/lib/enterprise-inbound-email/imap-secret-resolver";
import {
  parseInternalEmailDomains,
  resolveInternalEmailDomainsFromEnv,
} from "@/constants/enterprise-inbound-email";
import type {
  InboundEmailImapProbeResult,
  InboundEmailServerSettingsDto,
} from "@/types/enterprise-inbound-email";
import type { InboundImapConfig } from "@server/services/enterprise-inbound-email/imap-mailbox.service";
import { prisma } from "@server/lib/prisma";

async function resolveOrganizationId(): Promise<string> {
  const org = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!org) throw Object.assign(new Error("No organization found"), { statusCode: 503 });
  return org.id;
}

function envFallbackSettings(): InboundEmailServerSettingsDto {
  const host = process.env.INBOUND_EMAIL_IMAP_HOST?.trim() || null;
  const user = process.env.INBOUND_EMAIL_IMAP_USER?.trim() || null;
  const port = Number(process.env.INBOUND_EMAIL_IMAP_PORT || "993");
  const mailbox = process.env.INBOUND_EMAIL_MAILBOX?.trim() || "INBOX";
  const enabledRaw = process.env.INBOUND_EMAIL_ENABLED?.trim().toLowerCase();
  const enabled = enabledRaw === "true" || enabledRaw === "1";
  const hasCore = Boolean(host && user && isInboundImapPasswordConfigured());
  return {
    enabled,
    imapHost: host,
    imapPort: Number.isFinite(port) ? port : 993,
    imapUsername: user,
    mailbox,
    internalDomains: resolveInternalEmailDomainsFromEnv().join(","),
    passwordConfigured: isInboundImapPasswordConfigured(),
    passwordEnvKey: INBOUND_EMAIL_IMAP_PASSWORD_ENV,
    lastProbeAt: null,
    lastProbeOk: null,
    lastProbeMessage: null,
    source: hasCore ? "environment_fallback" : "unconfigured",
  };
}

export const inboundEmailServerConfigService = {
  async getSettingsDto(): Promise<InboundEmailServerSettingsDto> {
    const organizationId = await resolveOrganizationId();
    const row = await prisma.enterpriseInboundEmailServerConfig.findUnique({
      where: { organizationId },
    });
    if (!row) return envFallbackSettings();

    return {
      enabled: row.enabled,
      imapHost: row.imapHost,
      imapPort: row.imapPort,
      imapUsername: row.imapUsername,
      mailbox: row.mailbox || "INBOX",
      internalDomains: row.internalDomains || "rupeecatalyst.com",
      passwordConfigured: isInboundImapPasswordConfigured(),
      passwordEnvKey: INBOUND_EMAIL_IMAP_PASSWORD_ENV,
      lastProbeAt: row.lastProbeAt?.toISOString() ?? null,
      lastProbeOk: row.lastProbeOk,
      lastProbeMessage: row.lastProbeMessage,
      source: "database",
    };
  },

  async upsertSettings(input: {
    enabled: boolean;
    imapHost: string | null;
    imapPort: number;
    imapUsername: string | null;
    mailbox: string;
    internalDomains: string;
    actorUserId: string;
  }): Promise<InboundEmailServerSettingsDto> {
    const organizationId = await resolveOrganizationId();
    const mailbox = input.mailbox.trim() || "INBOX";
    const internalDomains =
      parseInternalEmailDomains(input.internalDomains).join(",") || "rupeecatalyst.com";
    const imapPort =
      Number.isFinite(input.imapPort) && input.imapPort > 0 ? Math.floor(input.imapPort) : 993;

    await prisma.enterpriseInboundEmailServerConfig.upsert({
      where: { organizationId },
      create: {
        organizationId,
        enabled: input.enabled,
        imapHost: input.imapHost?.trim() || null,
        imapPort,
        imapUsername: input.imapUsername?.trim().toLowerCase() || null,
        mailbox,
        internalDomains,
        modifiedByUserId: input.actorUserId,
      },
      update: {
        enabled: input.enabled,
        imapHost: input.imapHost?.trim() || null,
        imapPort,
        imapUsername: input.imapUsername?.trim().toLowerCase() || null,
        mailbox,
        internalDomains,
        modifiedByUserId: input.actorUserId,
      },
    });

    return this.getSettingsDto();
  },

  /**
   * Build IMAP connection settings for probe/ingestion.
   * When requireEnabled=false, allows Test Connection while the feature is still off.
   */
  async resolveRuntimeImapConfig(options?: {
    requireEnabled?: boolean;
  }): Promise<{
    enabled: boolean;
    configured: boolean;
    imap: InboundImapConfig | null;
    internalDomains: string[];
  }> {
    const requireEnabled = options?.requireEnabled !== false;
    const password = resolveInboundImapPassword();
    const organizationId = await resolveOrganizationId();
    const row = await prisma.enterpriseInboundEmailServerConfig.findUnique({
      where: { organizationId },
    });

    if (row) {
      const host = row.imapHost?.trim() || null;
      const user = row.imapUsername?.trim() || null;
      const mailbox = row.mailbox?.trim() || "INBOX";
      const internalDomains = parseInternalEmailDomains(row.internalDomains);
      const credentialsReady = Boolean(host && user && password);
      const allowed = requireEnabled ? row.enabled && credentialsReady : credentialsReady;
      const imap = allowed
        ? {
            host: host!,
            port: row.imapPort > 0 ? row.imapPort : 993,
            user: user!,
            password: password!,
            mailbox,
          }
        : null;
      return {
        enabled: row.enabled,
        configured: Boolean(row.enabled && credentialsReady),
        imap,
        internalDomains: internalDomains.length
          ? internalDomains
          : resolveInternalEmailDomainsFromEnv(),
      };
    }

    // Env fallback (legacy / pre-admin-config)
    const host = process.env.INBOUND_EMAIL_IMAP_HOST?.trim() || null;
    const user = process.env.INBOUND_EMAIL_IMAP_USER?.trim() || null;
    const port = Number(process.env.INBOUND_EMAIL_IMAP_PORT || "993");
    const mailbox = process.env.INBOUND_EMAIL_MAILBOX?.trim() || "INBOX";
    const enabledRaw = process.env.INBOUND_EMAIL_ENABLED?.trim().toLowerCase();
    const enabled = enabledRaw === "true" || enabledRaw === "1";
    const credentialsReady = Boolean(host && user && password);
    const allowed = requireEnabled ? enabled && credentialsReady : credentialsReady;
    const imap = allowed
      ? {
          host: host!,
          port: Number.isFinite(port) ? port : 993,
          user: user!,
          password: password!,
          mailbox,
        }
      : null;
    return {
      enabled,
      configured: Boolean(enabled && credentialsReady),
      imap,
      internalDomains: resolveInternalEmailDomainsFromEnv(),
    };
  },

  async recordProbeResult(result: InboundEmailImapProbeResult): Promise<void> {
    const organizationId = await resolveOrganizationId();
    const existing = await prisma.enterpriseInboundEmailServerConfig.findUnique({
      where: { organizationId },
    });
    if (!existing) return;
    await prisma.enterpriseInboundEmailServerConfig.update({
      where: { organizationId },
      data: {
        lastProbeAt: new Date(),
        lastProbeOk: result.ok,
        lastProbeMessage: result.message.slice(0, 500),
      },
    });
  },
};
