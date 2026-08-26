/**
 * CO-CHANAKYA-ENTERPRISE-READ-CONTEXT-002
 * Hard privacy: strip customer mobile / email before AI context.
 * Never rely on prompt instructions alone.
 */

const REDACTED = "[REDACTED]" as const;

/** Keys that must never carry raw customer contact channels into CHANAKYA context. */
const CONTACT_PII_KEY_PATTERN =
  /^(.*)?(mobile|phone|telephone|cell|whatsapp|email|e[_-]?mail|sms)(.*)?$/i;

const EXPLICIT_CONTACT_KEYS = new Set(
  [
    "mobile",
    "mobilePrimary",
    "mobileSecondary",
    "mobileMasked",
    "primaryMobile",
    "primaryContactMobile",
    "contactMobile",
    "customerMobile",
    "phone",
    "phoneNumber",
    "telephone",
    "whatsapp",
    "whatsappNumber",
    "email",
    "emailPrimary",
    "emailSecondary",
    "primaryEmail",
    "primaryContactEmail",
    "contactEmail",
    "customerEmail",
    "officialEmail",
    "officialMobile",
  ].map((k) => k.toLowerCase()),
);

function isContactPiiKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (EXPLICIT_CONTACT_KEYS.has(lower)) return true;
  // Avoid redacting non-contact fields like "emailStatus" operational aggregates
  // when they clearly do not hold an address — still redact *email / *mobile shapes.
  if (/emailaddress|email_address|mobile_number|phonenumber/i.test(key)) return true;
  if (CONTACT_PII_KEY_PATTERN.test(key)) {
    // Keep operational counters / flags that are not contact values.
    if (
      /email[_-]?status|emails?[_-]?(sent|queued|failed|count)|mobile[_-]?verified|phone[_-]?verified/i.test(
        key,
      )
    ) {
      return false;
    }
    return true;
  }
  return false;
}

/**
 * Deep-clone and redact customer contact channels.
 * Prefer omit (delete) for known keys; otherwise replace with [REDACTED].
 */
export function redactCustomerContactPiiForAiContext<T>(input: T, omitKeys = true): T {
  return redactUnknown(input, omitKeys, 0) as T;
}

function redactUnknown(value: unknown, omitKeys: boolean, depth: number): unknown {
  if (value == null) return value;
  if (depth > 12) return { truncated: true };
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactUnknown(item, omitKeys, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (isContactPiiKey(key)) {
        if (!omitKeys) out[key] = REDACTED;
        continue;
      }
      out[key] = redactUnknown(raw, omitKeys, depth + 1);
    }
    return out;
  }
  return String(value);
}

/** True when a JSON serialization still contains raw-looking contact PII keys with non-redacted values. */
export function assertNoCustomerContactPiiInAiContext(payload: unknown): void {
  const violations = collectContactPiiViolations(payload, "", 0);
  if (violations.length > 0) {
    throw Object.assign(
      new Error(
        `CHANAKYA context blocked: customer contact PII must be redacted (${violations.slice(0, 5).join(", ")}).`,
      ),
      { code: "CHANAKYA_PII_LEAK", statusCode: 500, violations },
    );
  }
}

function collectContactPiiViolations(
  value: unknown,
  path: string,
  depth: number,
): string[] {
  if (value == null || depth > 12) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, i) =>
      collectContactPiiViolations(item, `${path}[${i}]`, depth + 1),
    );
  }
  if (typeof value !== "object") return [];
  const found: string[] = [];
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const next = path ? `${path}.${key}` : key;
    if (isContactPiiKey(key)) {
      if (raw != null && raw !== REDACTED && String(raw).trim() !== "") {
        found.push(next);
      }
      continue;
    }
    found.push(...collectContactPiiViolations(raw, next, depth + 1));
  }
  return found;
}

export const CHANAKYA_CONTACT_PII_REDACTION_MARKER = REDACTED;
