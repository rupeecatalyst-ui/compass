/**
 * CO-MARKETING-MKT-11 — Identity match helpers (email / phone). No Contact writes.
 */

import { normalizeEcmMobile } from "@/lib/enterprise-contact-master";

export function normalizeMarketingMatchEmail(email: string | null | undefined): string | null {
  const v = (email ?? "").trim().toLowerCase();
  if (!v || !v.includes("@")) return null;
  return v;
}

export function normalizeMarketingMatchPhone(phone: string | null | undefined): string | null {
  const digits = normalizeEcmMobile(phone ?? "");
  if (!digits || digits.length < 10) return null;
  return digits.slice(-10);
}

export function emailsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizeMarketingMatchEmail(a);
  const right = normalizeMarketingMatchEmail(b);
  return Boolean(left && right && left === right);
}

export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizeMarketingMatchPhone(a);
  const right = normalizeMarketingMatchPhone(b);
  return Boolean(left && right && left === right);
}
