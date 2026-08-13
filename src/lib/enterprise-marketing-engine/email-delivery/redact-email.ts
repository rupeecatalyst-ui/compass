/**
 * CO-MARKETING-MKT-07 — Redact email for logs / delivery records.
 */

export function redactMarketingEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return "***";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const shown = local.length <= 1 ? "*" : `${local[0]}***`;
  return `${shown}@${domain}`;
}
