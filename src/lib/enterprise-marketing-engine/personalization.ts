/**
 * CO-MARKETING-MKT-04 / MKT-08 — Safe personalization token handling.
 * Allowlisted {{token}} only — no code execution.
 */

import {
  MARKETING_PERSONALIZATION_FALLBACKS,
  MARKETING_PERSONALIZATION_TOKEN_ALIASES,
  MARKETING_PERSONALIZATION_TOKENS,
  type MarketingPersonalizationToken,
} from "@/constants/enterprise-marketing-engine/content";
import { sanitizeMarketingPlainText } from "@/lib/enterprise-marketing-engine/html-sanitize";

const TOKEN_RE = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;
/** Any mustache pair — used to reject expressions, prototypes, and unknown tokens. */
const ANY_MUSTACHE_RE = /\{\{([^}]*)\}\}/g;
const ALLOWED = new Set<string>(MARKETING_PERSONALIZATION_TOKENS);
/** Structural tokens that are not audience personalisation — left intact for delivery. */
const RESERVED_STRUCTURAL_TOKENS = new Set(["unsubscribeUrl"]);

/** Resolve alias (e.g. first_name) to canonical allowlisted token (firstName). */
export function resolveCanonicalPersonalizationToken(
  name: string,
): MarketingPersonalizationToken | null {
  if (ALLOWED.has(name)) return name as MarketingPersonalizationToken;
  const alias = MARKETING_PERSONALIZATION_TOKEN_ALIASES[name];
  return alias ?? null;
}

export function listPersonalizationTokensInText(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(TOKEN_RE)) {
    const name = match[1];
    if (!name) continue;
    const canonical = resolveCanonicalPersonalizationToken(name);
    if (canonical) found.add(canonical);
  }
  return [...found];
}

export function assertSafePersonalizationTokens(text: string): void {
  for (const match of text.matchAll(ANY_MUSTACHE_RE)) {
    const inner = (match[1] ?? "").trim();
    if (RESERVED_STRUCTURAL_TOKENS.has(inner)) continue;
    if (!resolveCanonicalPersonalizationToken(inner)) {
      throw Object.assign(
        new Error(
          `Unsafe or unknown personalization token "{{${inner}}}". Allowed: ${MARKETING_PERSONALIZATION_TOKENS.join(", ")} ({{first_name}} is accepted as an alias for firstName).`,
        ),
        { statusCode: 400, code: "INVALID_PERSONALIZATION_TOKEN" },
      );
    }
  }
}

export function escapeMarketingMergeValue(value: string): string {
  return sanitizeMarketingPlainText(value);
}

/**
 * Apply allowlisted tokens. Missing values use safe fallbacks (never leave raw tokens in rendered email).
 * Recipient-derived merge values are HTML-escaped by default. Template HTML is preserved.
 * Does not execute arbitrary expressions.
 */
export function applyPersonalization(
  text: string,
  values: Partial<Record<MarketingPersonalizationToken, string>>,
  opts?: { leavePlaceholders?: boolean; escapeHtml?: boolean },
): string {
  assertSafePersonalizationTokens(text);
  const escapeHtml = opts?.escapeHtml !== false;
  const normalized: Partial<Record<MarketingPersonalizationToken, string>> = {
    ...values,
  };
  // Alias: companyName ↔ company
  if (!normalized.companyName && normalized.company) {
    normalized.companyName = normalized.company;
  }
  if (!normalized.company && normalized.companyName) {
    normalized.company = normalized.companyName;
  }

  return text.replace(TOKEN_RE, (_full, name: string) => {
    if (RESERVED_STRUCTURAL_TOKENS.has(name)) return `{{${name}}}`;
    const key = resolveCanonicalPersonalizationToken(name);
    if (!key) {
      if (opts?.leavePlaceholders) return `{{${name}}}`;
      return "";
    }
    const v = normalized[key];
    const raw =
      v != null && String(v).length
        ? String(v)
        : opts?.leavePlaceholders
          ? `{{${name}}}`
          : (MARKETING_PERSONALIZATION_FALLBACKS[key] ?? "");
    if (opts?.leavePlaceholders && raw === `{{${name}}}`) return raw;
    return escapeHtml ? escapeMarketingMergeValue(raw) : raw;
  });
}

export function defaultPersonalizationSample(): Record<MarketingPersonalizationToken, string> {
  return {
    firstName: "Asha",
    lastName: "Verma",
    fullName: "Asha Verma",
    city: "Pune",
    state: "Maharashtra",
    profession: "Professional",
    company: "Example Corp",
    companyName: "Example Corp",
    product: "Home Loan",
    senderName: "Rupee Catalyst Campaigns",
  };
}

export function scanDocumentTokens(content: {
  blocks: Array<{ props: Record<string, unknown> }>;
}): string[] {
  const texts: string[] = [];
  for (const b of content.blocks) {
    for (const v of Object.values(b.props)) {
      if (typeof v === "string") texts.push(v);
    }
  }
  const all = new Set<string>();
  for (const t of texts) {
    for (const tok of listPersonalizationTokensInText(t)) all.add(tok);
  }
  return [...all];
}
