/**
 * CO-MARKETING-HOSTINGER-SMTP-001B — Hostinger SMTP transport factory.
 * Nodemailer is created lazily and only after gates + TLS config pass.
 * createTransport does not open a socket; send/verify do. Tests inject a client factory.
 * Default live flags remain OFF, so production never connects.
 */

import {
  ENTERPRISE_MARKETING_EXECUTION_ENABLED,
  ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
} from "@/constants/enterprise-marketing-engine";
import {
  MARKETING_PHASE1_SMTP_MAX_CONCURRENT,
  MARKETING_SMTP_BLOCK,
} from "@/constants/enterprise-marketing-engine/hostinger-smtp";
import type {
  MarketingSmtpMessage,
  MarketingSmtpTransport,
  MarketingSmtpTransportResult,
  MarketingSmtpVerifyResult,
} from "@/lib/enterprise-marketing-engine/ports/smtp-transport.port";
import {
  assessMarketingSmtpConfig,
  marketingSmtpConfigIsComplete,
  readMarketingSmtpPassword,
  readMarketingSmtpUsername,
  resolveMarketingSmtpConnectionOptions,
  sanitizeMarketingSmtpError,
} from "@/lib/enterprise-marketing-engine/smtp-config";

export type MarketingSmtpClient = {
  sendMail(message: {
    from: string;
    to: string;
    replyTo?: string;
    subject: string;
    html: string;
    text: string;
    headers?: Record<string, string>;
  }): Promise<{ messageId?: string | null }>;
  verify(): Promise<boolean>;
};

export type MarketingSmtpClientFactory = (input: {
  host: string;
  port: number;
  secure: boolean;
  requireTLS: true;
  auth: { user: string; pass: string };
  pool: true;
  maxConnections: number;
  logger: false;
  debug: false;
  tls: { minVersion: "TLSv1.2" };
}) => MarketingSmtpClient;

export type HostingerSmtpTransportOptions = {
  env?: Record<string, string | undefined>;
  gates?: {
    executionEnabled: boolean;
    providerConnectEnabled: boolean;
  };
  clientFactory?: MarketingSmtpClientFactory;
};

export type HostingerSmtpTransportHandle = MarketingSmtpTransport & {
  clientCreateCount(): number;
};

async function defaultNodemailerFactory(
  input: Parameters<MarketingSmtpClientFactory>[0],
): Promise<MarketingSmtpClient> {
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: input.host,
    port: input.port,
    secure: input.secure,
    requireTLS: input.requireTLS,
    auth: input.auth,
    pool: true,
    maxConnections: input.maxConnections,
    logger: false,
    debug: false,
    tls: { minVersion: "TLSv1.2" },
  });
  return {
    sendMail: (message) => transporter.sendMail(message),
    verify: () => transporter.verify(),
  };
}

function blockedVerify(code: string, notice: string): MarketingSmtpVerifyResult {
  return { status: "BLOCKED", code, notice };
}

function notConfiguredVerify(code: string): MarketingSmtpVerifyResult {
  return { status: "NOT_CONFIGURED", code, notice: "SMTP configuration is incomplete" };
}

export function createHostingerSmtpTransport(
  options: HostingerSmtpTransportOptions = {},
): HostingerSmtpTransportHandle {
  const env = options.env ?? (typeof process !== "undefined" ? process.env : {});
  const gates = options.gates ?? {
    executionEnabled: ENTERPRISE_MARKETING_EXECUTION_ENABLED,
    providerConnectEnabled: ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
  };
  let client: MarketingSmtpClient | null = null;
  let clientCreateCount = 0;

  async function ensureClient(): Promise<
    | { ok: true; client: MarketingSmtpClient }
    | { ok: false; result: MarketingSmtpTransportResult; verify: MarketingSmtpVerifyResult }
  > {
    if (!gates.providerConnectEnabled) {
      return {
        ok: false,
        result: {
          accepted: false,
          providerMessageId: null,
          retryable: false,
          errorCode: MARKETING_SMTP_BLOCK.providerConnectDisabled,
        },
        verify: blockedVerify(
          MARKETING_SMTP_BLOCK.providerConnectDisabled,
          "Marketing provider connect is disabled",
        ),
      };
    }
    const assessment = assessMarketingSmtpConfig(env);
    if (!marketingSmtpConfigIsComplete(assessment)) {
      const code = assessment.blockers[0] ?? MARKETING_SMTP_BLOCK.configMissing;
      return {
        ok: false,
        result: {
          accepted: false,
          providerMessageId: null,
          retryable: false,
          errorCode: code,
        },
        verify: notConfiguredVerify(code),
      };
    }
    const resolved = resolveMarketingSmtpConnectionOptions(env);
    if (!resolved.ok) {
      const code = resolved.blockers[0] ?? MARKETING_SMTP_BLOCK.configMissing;
      return {
        ok: false,
        result: {
          accepted: false,
          providerMessageId: null,
          retryable: false,
          errorCode: code,
        },
        verify: notConfiguredVerify(code),
      };
    }
    if (client) return { ok: true, client };
    const username = readMarketingSmtpUsername(env);
    const password = readMarketingSmtpPassword(env);
    const factoryInput = {
      host: resolved.connection.host,
      port: resolved.connection.port,
      secure: resolved.connection.secure,
      requireTLS: true as const,
      auth: { user: username, pass: password },
      pool: true as const,
      maxConnections: MARKETING_PHASE1_SMTP_MAX_CONCURRENT,
      logger: false as const,
      debug: false as const,
      tls: { minVersion: "TLSv1.2" as const },
    };
    clientCreateCount += 1;
    client = options.clientFactory
      ? options.clientFactory(factoryInput)
      : await defaultNodemailerFactory(factoryInput);
    return { ok: true, client };
  }

  return {
    clientCreateCount: () => clientCreateCount,
    async send(message: MarketingSmtpMessage): Promise<MarketingSmtpTransportResult> {
      if (!gates.executionEnabled) {
        return {
          accepted: false,
          providerMessageId: null,
          retryable: false,
          errorCode: MARKETING_SMTP_BLOCK.executionDisabled,
        };
      }
      const ready = await ensureClient();
      if (!ready.ok) return ready.result;
      try {
        const sent = await ready.client.sendMail({
          from: `${message.fromName} <${message.fromEmail}>`,
          to: message.to,
          replyTo: message.replyTo,
          subject: message.subject,
          html: message.html,
          text: message.text,
          headers: { "X-Marketing-Idempotency-Key": message.idempotencyKey },
        });
        return {
          accepted: true,
          providerMessageId: sent.messageId ?? null,
          retryable: false,
        };
      } catch {
        return {
          accepted: false,
          providerMessageId: null,
          retryable: true,
          errorCode: MARKETING_SMTP_BLOCK.transportFailure,
        };
      }
    },

    async verify(): Promise<MarketingSmtpVerifyResult> {
      const ready = await ensureClient();
      if (!ready.ok) return ready.verify;
      try {
        const ok = await ready.client.verify();
        if (!ok) {
          return {
            status: "FAILED",
            code: MARKETING_SMTP_BLOCK.transportFailure,
            notice: "SMTP handshake did not succeed",
          };
        }
        return {
          status: "CONNECTED",
          code: null,
          notice: "SMTP handshake succeeded. No message was sent.",
        };
      } catch (err) {
        return {
          status: "FAILED",
          code: MARKETING_SMTP_BLOCK.transportFailure,
          notice: sanitizeMarketingSmtpError(err instanceof Error ? err.message : "SMTP handshake failed"),
        };
      }
    },
  };
}
