/**
 * CO-C1-OPERATIONAL-EMAIL-001B — Server-side SMTP secret resolution.
 * Secrets live in host environment only — never Git, browser, or Base64 DB storage.
 */

import type { EnterpriseCommunicationProfileCode } from "@/types/enterprise-communication-center";

const ENV_BY_PROFILE: Partial<Record<EnterpriseCommunicationProfileCode, string>> = {
  CUSTOMERS: "ECC_CUSTOMERS_SMTP_PASSWORD",
};

/** Returns true when a server-side SMTP secret is available for the profile. */
export function isSmtpSecretConfigured(
  profileCode: EnterpriseCommunicationProfileCode,
): boolean {
  return Boolean(resolveSmtpSecret(profileCode));
}

/**
 * Resolve SMTP password from host-injected environment variables only.
 * Never logs or returns secrets to clients.
 */
export function resolveSmtpSecret(
  profileCode: EnterpriseCommunicationProfileCode,
): string | null {
  const key = ENV_BY_PROFILE[profileCode];
  if (!key) return null;
  const value = process.env[key]?.trim();
  return value || null;
}

/** Legacy DB Base64 storage is retired — env is the only supported credential path. */
export function hasLegacyDbSmtpCredential(_smtpPasswordEnc: string | null): boolean {
  return false;
}
