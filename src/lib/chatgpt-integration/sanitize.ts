/**
 * CO-CHATGPT-INTEGRATION-V1 — PII minimization and secret guards for responses.
 */

const FORBIDDEN_SUBSTRINGS = [
  "JWT_SECRET",
  "CRON_SECRET",
  "SUPABASE_SERVICE_ROLE",
  "DATABASE_URL",
  "postgresql://",
  "Bearer eyJ",
  "password=",
  "smtp_password",
  "IMAP_PASSWORD",
] as const;

const SECRET_KEY_PATTERN =
  /^(password|secret|token|api[_-]?key|authorization|jwt|refreshToken|private[_-]?key|connectionString|databaseUrl)$/i;

/** Customer contact channels — never leave ChatGPT / CHANAKYA action responses. */
const CUSTOMER_CONTACT_PII_KEY_PATTERN =
  /^(primaryContactMobile|primaryContactEmail|mobilePrimary|mobileSecondary|officialMobile|officialEmail|customerMobile|customerEmail|contactMobile|contactEmail|mobile|email|phone|telephone|whatsapp)$/i;

export function redactPersonName(name: string | null | undefined): string | null {
  if (!name?.trim()) return null;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return `${parts[0]!.charAt(0).toUpperCase()}.`;
  return `${parts[0]!.charAt(0).toUpperCase()}. ${parts[parts.length - 1]!.charAt(0).toUpperCase()}.`;
}

export function truncateText(value: string | null | undefined, max = 160): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`;
}

export function assertNoSecretsInResponse(payload: unknown): void {
  const json = JSON.stringify(payload);
  for (const needle of FORBIDDEN_SUBSTRINGS) {
    if (json.includes(needle)) {
      throw new Error(`ChatGPT integration response blocked: forbidden content pattern (${needle}).`);
    }
  }
}

export function sanitizeRecordForChatGpt(
  value: Record<string, unknown>,
  depth = 0,
): Record<string, unknown> {
  if (depth > 5) return { truncated: true };
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (SECRET_KEY_PATTERN.test(key) || CUSTOMER_CONTACT_PII_KEY_PATTERN.test(key)) {
      // Omit customer contact channels entirely (preferred over [REDACTED] placeholder).
      if (CUSTOMER_CONTACT_PII_KEY_PATTERN.test(key)) continue;
      out[key] = "[REDACTED]";
      continue;
    }
    out[key] = sanitizeUnknownForChatGpt(raw, depth + 1);
  }
  return out;
}

export function sanitizeUnknownForChatGpt(value: unknown, depth = 0): unknown {
  if (value == null) return value;
  if (typeof value === "string") return truncateText(value, 500);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((v) => sanitizeUnknownForChatGpt(v, depth + 1));
  }
  if (typeof value === "object") {
    return sanitizeRecordForChatGpt(value as Record<string, unknown>, depth);
  }
  return String(value);
}
