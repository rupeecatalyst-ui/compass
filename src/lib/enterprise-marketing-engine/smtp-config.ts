/**
 * CO-MARKETING-HOSTINGER-SMTP-001 — SMTP config presence. Never returns secret values.
 */

import {
  MARKETING_PHASE1_FROM_EMAIL,
  MARKETING_PHASE1_FROM_NAME,
  MARKETING_PHASE1_REPLY_TO,
  MARKETING_PHASE1_SMTP_MAX_CONCURRENT,
  MARKETING_SMTP_ALLOWED_PORTS,
  MARKETING_SMTP_BLOCK,
  MARKETING_SMTP_DEFAULT_HOST,
  MARKETING_SMTP_ENV,
  MARKETING_SMTP_PREFERRED_PORT,
} from "@/constants/enterprise-marketing-engine/hostinger-smtp";

export type MarketingSmtpConfigPresence = {
  hostPresent: boolean;
  portPresent: boolean;
  port: number | null;
  portValid: boolean;
  secure: boolean;
  usernamePresent: boolean;
  passwordPresent: boolean;
  fromEmailPresent: boolean;
  fromNamePresent: boolean;
  replyToPresent: boolean;
  fromEmailMatchesPhase1: boolean;
  fromNameMatchesPhase1: boolean;
  replyToMatchesPhase1: boolean;
  tlsSafe: boolean;
  blockers: string[];
};

function readEnv(env: Record<string, string | undefined>, name: string): string {
  return (env[name] ?? "").trim();
}

function parsePort(raw: string): number | null {
  if (!raw) return null;
  const port = Number.parseInt(raw, 10);
  if (!Number.isInteger(port)) return null;
  return port;
}

export function assessMarketingSmtpConfig(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): MarketingSmtpConfigPresence {
  const hostPresent = Boolean(readEnv(env, MARKETING_SMTP_ENV.host));
  const portRaw = readEnv(env, MARKETING_SMTP_ENV.port);
  const port = parsePort(portRaw);
  const portPresent = Boolean(portRaw);
  const portValid = port != null && (MARKETING_SMTP_ALLOWED_PORTS as readonly number[]).includes(port);
  const secureFlag = readEnv(env, MARKETING_SMTP_ENV.secure).toLowerCase();
  const secure = port === MARKETING_SMTP_PREFERRED_PORT || secureFlag === "true" || secureFlag === "1";
  const usernamePresent = Boolean(readEnv(env, MARKETING_SMTP_ENV.username));
  const passwordPresent = Boolean(readEnv(env, MARKETING_SMTP_ENV.password));
  const fromEmail = readEnv(env, MARKETING_SMTP_ENV.fromEmail).toLowerCase();
  const fromName = readEnv(env, MARKETING_SMTP_ENV.fromName);
  const replyTo = readEnv(env, MARKETING_SMTP_ENV.replyTo).toLowerCase();
  const fromEmailPresent = Boolean(fromEmail);
  const fromNamePresent = Boolean(fromName);
  const replyToPresent = Boolean(replyTo);
  const fromEmailMatchesPhase1 = fromEmail === MARKETING_PHASE1_FROM_EMAIL;
  const fromNameMatchesPhase1 = fromName === MARKETING_PHASE1_FROM_NAME;
  const replyToMatchesPhase1 = replyTo === MARKETING_PHASE1_REPLY_TO;
  const secureExplicitFalse = secureFlag === "false" || secureFlag === "0";
  const tlsSafe =
    portValid &&
    !(port === MARKETING_SMTP_PREFERRED_PORT && secureExplicitFalse) &&
    (port === MARKETING_SMTP_PREFERRED_PORT || port === 587);
  const blockers: string[] = [];
  if (!hostPresent) blockers.push(MARKETING_SMTP_BLOCK.hostMissing);
  if (!usernamePresent) blockers.push(MARKETING_SMTP_BLOCK.usernameMissing);
  if (!passwordPresent) blockers.push(MARKETING_SMTP_BLOCK.passwordMissing);
  if (!portValid) blockers.push(MARKETING_SMTP_BLOCK.invalidPort);
  if (portValid && !tlsSafe) blockers.push(MARKETING_SMTP_BLOCK.tlsRequired);
  if (!fromEmailMatchesPhase1 || !fromNameMatchesPhase1 || !replyToMatchesPhase1) {
    blockers.push(MARKETING_SMTP_BLOCK.senderNotPhase1);
  }
  return {
    hostPresent,
    portPresent,
    port,
    portValid,
    secure,
    usernamePresent,
    passwordPresent,
    fromEmailPresent,
    fromNamePresent,
    replyToPresent,
    fromEmailMatchesPhase1,
    fromNameMatchesPhase1,
    replyToMatchesPhase1,
    tlsSafe,
    blockers,
  };
}

export function marketingSmtpConfigIsComplete(config: MarketingSmtpConfigPresence): boolean {
  return config.blockers.length === 0;
}

export type MarketingSmtpConnectionOptions = {
  host: string;
  port: number;
  secure: boolean;
  requireTLS: true;
  pool: true;
  maxConnections: number;
  logger: false;
  debug: false;
};

export function resolveMarketingSmtpConnectionOptions(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): { ok: true; connection: MarketingSmtpConnectionOptions } | { ok: false; blockers: string[] } {
  const assessment = assessMarketingSmtpConfig(env);
  if (!marketingSmtpConfigIsComplete(assessment) || assessment.port == null) {
    return { ok: false, blockers: assessment.blockers };
  }
  return {
    ok: true,
    connection: {
      host: readEnv(env, MARKETING_SMTP_ENV.host) || MARKETING_SMTP_DEFAULT_HOST,
      port: assessment.port,
      secure: assessment.port === MARKETING_SMTP_PREFERRED_PORT,
      requireTLS: true,
      pool: true,
      maxConnections: MARKETING_PHASE1_SMTP_MAX_CONCURRENT,
      logger: false,
      debug: false,
    },
  };
}

export function readMarketingSmtpUsername(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): string {
  return readEnv(env, MARKETING_SMTP_ENV.username);
}

export function readMarketingSmtpPassword(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): string {
  return readEnv(env, MARKETING_SMTP_ENV.password);
}

export function sanitizeMarketingSmtpError(message: string): string {
  return message.replace(/(pass(word)?|pwd|secret|auth|user(name)?)\s*[:=]\s*\S+/gi, "$1=[redacted]");
}
