/**
 * CO-MARKETING-MKT-04 / MKT-08 — Safe personalization token handling.
 * Allowlisted {{token}} only — no code execution.
 */

import {
  MARKETING_PERSONALIZATION_FALLBACKS,
  MARKETING_PERSONALIZATION_TOKENS,
  type MarketingPersonalizationToken,
} from "@/constants/enterprise-marketing-engine/content";

const TOKEN_RE = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;
/** Any mustache pair — used to reject expressions, prototypes, and unknown tokens. */
const ANY_MUSTACHE_RE = /\{\{([^}]*)\}\}/g;
const ALLOWED = new Set<string>(MARKETING_PERSONALIZATION_TOKENS);

export function listPersonalizationTokensInText(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(TOKEN_RE)) {
    const name = match[1];
    if (name) found.add(name);
  }
  return [...found];
}

export function assertSafePersonalizationTokens(text: string): void {
  for (const match of text.matchAll(ANY_MUSTACHE_RE)) {
    const inner = (match[1] ?? "").trim();
    if (!ALLOWED.has(inner)) {
      throw Object.assign(
        new Error(
          `Unsafe or unknown personalization token "{{${inner}}}". Allowed: ${MARKETING_PERSONALIZATION_TOKENS.join(", ")}`,
        ),
        { statusCode: 400, code: "INVALID_PERSONALIZATION_TOKEN" },
      );
    }
  }
}

/**
 * Apply allowlisted tokens. Missing values use safe fallbacks (never leave raw tokens in rendered email).
 * Does not execute arbitrary expressions.
 */
export function applyPersonalization(
  text: string,
  values: Partial<Record<MarketingPersonalizationToken, string>>,
  opts?: { leavePlaceholders?: boolean },
): string {
  assertSafePersonalizationTokens(text);
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
    const key = name as MarketingPersonalizationToken;
    const v = normalized[key];
    if (v != null && String(v).length) return String(v);
    if (opts?.leavePlaceholders) return `{{${name}}}`;
    return MARKETING_PERSONALIZATION_FALLBACKS[key] ?? "";
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
