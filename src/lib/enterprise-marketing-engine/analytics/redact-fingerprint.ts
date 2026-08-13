/**
 * CO-MARKETING-MKT-10 — Analytics privacy: never expose raw email/phone via fingerprints.
 */

export function redactMarketingFingerprint(fingerprint: string | null | undefined): string {
  const raw = (fingerprint ?? "").trim();
  if (!raw) return "—";

  const at = raw.indexOf("@");
  if (at > 0) {
    const localStart = raw.lastIndexOf(":", at);
    const prefix = localStart >= 0 ? raw.slice(0, localStart + 1) : "";
    const local = raw.slice(prefix.length, at);
    const domain = raw.slice(at + 1);
    const initial = local.charAt(0) || "*";
    return `${prefix}${initial}***@${domain}`;
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 8) {
    return raw.replace(/\d(?=\d{4})/g, "*");
  }

  if (raw.length <= 8) return `${raw.charAt(0)}***`;
  return `${raw.slice(0, 8)}…`;
}

export function analyticsPayloadContainsPii(payload: unknown): boolean {
  const text = JSON.stringify(payload);
  if (!text) return false;
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text) && !text.includes("***@")) {
    return true;
  }
  return false;
}
