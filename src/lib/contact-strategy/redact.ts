/**
 * CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007
 * New Contact Strategy surfaces must never expose email or mobile numbers.
 */

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const MOBILE_KEY = /^(email|personalEmail|officialEmail|mobile|mobilePrimary|mobileSecondary|phone|telephone|whatsapp)$/i;

function looksLikeMobile(value: string): boolean {
  const text = value.trim();
  if (!text) return false;
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return false;
  if (/\b(OPP|DEAL|TK|TASK)-/i.test(text)) return false;
  const compact = text.replace(/[\s()-]/g, "");
  return /^(?:\+91)?[6-9]\d{9}$/.test(compact);
}

export function contactStrategyTextLeaksPii(value: unknown, key?: string): boolean {
  if (value == null) return false;
  if (key && MOBILE_KEY.test(key)) return true;
  if (typeof value === "string") return EMAIL.test(value) || looksLikeMobile(value);
  if (Array.isArray(value)) return value.some((item) => contactStrategyTextLeaksPii(item, key));
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).some(([nestedKey, nested]) =>
      contactStrategyTextLeaksPii(nested, nestedKey),
    );
  }
  return false;
}

export function assertNoContactStrategyPii(payload: unknown, label = "contact-strategy"): void {
  if (contactStrategyTextLeaksPii(payload)) {
    throw new Error(`${label} payload must not include email or mobile values.`);
  }
}
