/**
 * CO-MARKETING-MKT-02 — Data quality helpers for marketing audience rows.
 * Does NOT create Contacts / Opportunities / Leads.
 */

import {
  MARKETING_SHEETS_EMAIL_HEADER_ALIASES,
  MARKETING_SHEETS_EXTERNAL_KEY_HEADER_ALIASES,
  MARKETING_SHEETS_PHONE_HEADER_ALIASES,
} from "@/constants/enterprise-marketing-engine";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

export function findHeaderByAliases(
  headers: string[],
  aliases: readonly string[],
): string | null {
  const aliasSet = new Set(aliases.map((a) => normalizeHeader(a)));
  for (const h of headers) {
    if (aliasSet.has(normalizeHeader(h))) return h;
  }
  return null;
}

export function detectMarketingSheetColumns(headers: string[]) {
  return {
    emailColumn: findHeaderByAliases(headers, MARKETING_SHEETS_EMAIL_HEADER_ALIASES),
    phoneColumn: findHeaderByAliases(headers, MARKETING_SHEETS_PHONE_HEADER_ALIASES),
    externalKeyColumn: findHeaderByAliases(
      headers,
      MARKETING_SHEETS_EXTERNAL_KEY_HEADER_ALIASES,
    ),
  };
}

export function isValidMarketingEmail(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v) return false;
  return EMAIL_RE.test(v);
}

export function normalizeMarketingPhone(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const digits = String(value).replace(/\D+/g, "");
  if (digits.length < 8) return null;
  return digits;
}

/** Stable fingerprint for ledger identity — not an operational Contact id. */
export function buildMarketingRecipientFingerprint(input: {
  email?: string | null;
  phone?: string | null;
  externalKey?: string | null;
}): string | null {
  const external = input.externalKey?.trim();
  if (external) return `ext:${external.toLowerCase()}`;
  const email = input.email?.trim().toLowerCase();
  if (email && isValidMarketingEmail(email)) return `email:${email}`;
  const phone = normalizeMarketingPhone(input.phone ?? null);
  if (phone) return `phone:${phone}`;
  return null;
}

export type MarketingRowQualityIssue =
  | "missing_identity"
  | "invalid_email"
  | "missing_email"
  | "missing_phone"
  | "duplicate_in_sample";

export type MarketingRowQualityResult = {
  sourceRowNumber?: number;
  fingerprint: string | null;
  issues: MarketingRowQualityIssue[];
  email?: string | null;
  phone?: string | null;
  externalKey?: string | null;
};

export function assessMarketingRowQuality(
  row: Record<string, unknown>,
  columns: {
    emailColumn: string | null;
    phoneColumn: string | null;
    externalKeyColumn: string | null;
  },
  opts?: { sourceRowNumber?: number; seenFingerprints?: Set<string> },
): MarketingRowQualityResult {
  const emailRaw = columns.emailColumn ? row[columns.emailColumn] : null;
  const phoneRaw = columns.phoneColumn ? row[columns.phoneColumn] : null;
  const externalRaw = columns.externalKeyColumn
    ? row[columns.externalKeyColumn]
    : null;

  const email =
    typeof emailRaw === "string" || typeof emailRaw === "number"
      ? String(emailRaw).trim()
      : null;
  const phone =
    typeof phoneRaw === "string" || typeof phoneRaw === "number"
      ? String(phoneRaw).trim()
      : null;
  const externalKey =
    typeof externalRaw === "string" || typeof externalRaw === "number"
      ? String(externalRaw).trim()
      : null;

  const issues: MarketingRowQualityIssue[] = [];

  if (email && !isValidMarketingEmail(email)) {
    issues.push("invalid_email");
  }
  if (columns.emailColumn && !email) {
    issues.push("missing_email");
  }
  if (columns.phoneColumn && !phone) {
    issues.push("missing_phone");
  }

  const fingerprint = buildMarketingRecipientFingerprint({
    email: email && isValidMarketingEmail(email) ? email : null,
    phone,
    externalKey,
  });

  if (!fingerprint) {
    issues.push("missing_identity");
  } else if (opts?.seenFingerprints) {
    if (opts.seenFingerprints.has(fingerprint)) {
      issues.push("duplicate_in_sample");
    } else {
      opts.seenFingerprints.add(fingerprint);
    }
  }

  return {
    sourceRowNumber: opts?.sourceRowNumber,
    fingerprint,
    issues,
    email,
    phone,
    externalKey,
  };
}

export function fingerprintSchemaHeaders(headers: string[]): string {
  const normalized = headers.map((h) => normalizeHeader(h)).join("|");
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) | 0;
  }
  return `hdr_${(hash >>> 0).toString(16)}`;
}

export function summarizeSampleQuality(results: MarketingRowQualityResult[]) {
  const counts: Record<MarketingRowQualityIssue, number> = {
    missing_identity: 0,
    invalid_email: 0,
    missing_email: 0,
    missing_phone: 0,
    duplicate_in_sample: 0,
  };
  for (const r of results) {
    for (const issue of r.issues) counts[issue] += 1;
  }
  return {
    sampleSize: results.length,
    withFingerprint: results.filter((r) => r.fingerprint).length,
    issueCounts: counts,
  };
}
