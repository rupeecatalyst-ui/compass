/**
 * Server-side SMTP secret resolution.
 * Secrets live in host environment only — never Git, browser, or database.
 * CUSTOMERS keeps its existing variable. Additional profiles use
 * ECC_<PROFILE_CODE>_SMTP_PASSWORD, so a new address needs no code change.
 */

export function smtpSecretEnvName(profileCode: string): string | null {
  const code = profileCode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  if (!code) return null;
  if (code === "CUSTOMERS") return "ECC_CUSTOMERS_SMTP_PASSWORD";
  return `ECC_${code}_SMTP_PASSWORD`;
}

/** Returns true when a server-side SMTP secret is available for the profile. */
export function isSmtpSecretConfigured(profileCode: string): boolean {
  return Boolean(resolveSmtpSecret(profileCode));
}

/**
 * Resolve SMTP password from host-injected environment variables only.
 * Never logs or returns secrets to clients.
 */
export function resolveSmtpSecret(profileCode: string): string | null {
  const key = smtpSecretEnvName(profileCode);
  if (!key) return null;
  const value = process.env[key]?.trim();
  return value || null;
}

/** Legacy DB Base64 storage is retired — env is the only supported credential path. */
export function hasLegacyDbSmtpCredential(_smtpPasswordEnc: string | null): boolean {
  return false;
}
