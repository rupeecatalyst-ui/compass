/**
 * CO-OPS-002 — Never log passwords, JWTs, or sensitive personal information.
 */

const SENSITIVE_KEY =
  /^(password|passwd|pwd|secret|token|accessToken|refreshToken|authorization|cookie|jwt|api[_-]?key|pan|aadhaar|aadhar|ssn|cvv|otp)$/i;

const SENSITIVE_VALUE =
  /\b(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|Bearer\s+[A-Za-z0-9._~+/=-]{20,})\b/i;

export function redactString(value: string): string {
  if (!value) return value;
  if (SENSITIVE_VALUE.test(value)) return "[REDACTED]";
  return value.length > 2000 ? `${value.slice(0, 2000)}…` : value;
}

export function redactUnknown(value: unknown, depth = 0): unknown {
  if (value == null) return value;
  if (depth > 4) return "[TRUNCATED]";
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redactUnknown(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(k)) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = redactUnknown(v, depth + 1);
      }
    }
    return out;
  }
  return String(value);
}

/** Safe scalar for audit previous/new — never store raw PII blobs. */
export function toAuditScalar(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (SENSITIVE_VALUE.test(trimmed) || /password|token|jwt/i.test(trimmed)) {
      return "[REDACTED]";
    }
    return trimmed.length > 240 ? `${trimmed.slice(0, 240)}…` : trimmed;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    const json = JSON.stringify(redactUnknown(value));
    return json.length > 240 ? `${json.slice(0, 240)}…` : json;
  } catch {
    return "[UNSERIALIZABLE]";
  }
}
