/**
 * CO-C1-COMMUNICATION-002 — IMAP password presence (host env only; ECC pattern).
 * Never logs or returns the secret value.
 */

export const INBOUND_EMAIL_IMAP_PASSWORD_ENV = "INBOUND_EMAIL_IMAP_PASSWORD" as const;

/** True when server-side IMAP password env is present. */
export function isInboundImapPasswordConfigured(): boolean {
  return Boolean(resolveInboundImapPassword());
}

/**
 * Resolve IMAP password from host-injected environment only.
 * Never expose to clients or logs.
 */
export function resolveInboundImapPassword(): string | null {
  const value = process.env[INBOUND_EMAIL_IMAP_PASSWORD_ENV]?.trim();
  return value || null;
}
