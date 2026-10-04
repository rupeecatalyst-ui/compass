/**
 * CO-MARKETING-REDESIGN-008 — Searchable personalisation catalogue from confirmed mapping.
 * Sensitive columns are never auto-exposed. Approval blocks unsupported / unresolved tokens.
 */

import {
  MARKETING_PERSONALIZATION_FALLBACKS,
  MARKETING_PERSONALIZATION_TOKENS,
  type MarketingPersonalizationToken,
} from "@/constants/enterprise-marketing-engine/content";
import {
  MARKETING_PERSONALISATION_LABELS,
  MARKETING_PERSONALISATION_SENSITIVE_FIELDS,
  MARKETING_RESERVED_STRUCTURAL_TOKENS,
} from "@/constants/enterprise-marketing-engine/personalisation";
import type { MarketingColumnMap } from "@/types/enterprise-marketing-durability";
import type { MarketingContentDocument } from "@/types/enterprise-marketing-campaign";
import {
  resolveCanonicalPersonalizationToken,
} from "@/lib/enterprise-marketing-engine/personalization";

const ANY_MUSTACHE_RE = /\{\{\s*([^}]+?)\s*\}\}/g;
const ALLOWED = new Set<string>(MARKETING_PERSONALIZATION_TOKENS);
const RESERVED = new Set<string>(MARKETING_RESERVED_STRUCTURAL_TOKENS);
const SENSITIVE = new Set<string>(MARKETING_PERSONALISATION_SENSITIVE_FIELDS);

export type MarketingPersonalisationCatalogueSource = "mapped" | "system";

export type MarketingPersonalisationCatalogueEntry = {
  token: MarketingPersonalizationToken;
  label: string;
  source: MarketingPersonalisationCatalogueSource;
  mappedHeader: string | null;
  fallback: string;
  insertValue: string;
  searchable: string;
};

export type MarketingPersonalisationSampleRecipient = {
  id: string;
  sourceRowNumber: number | null;
  label: string;
  values: Partial<Record<MarketingPersonalizationToken, string>>;
  source: "audience_preview";
};

export type MarketingPersonalisationInspection = {
  usedTokens: string[];
  unsupportedTokens: string[];
  unresolvedTokens: string[];
  missingFallbackTokens: string[];
  blocking: boolean;
};

export function listAllMarketingMustacheTokens(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(ANY_MUSTACHE_RE)) {
    const inner = (match[1] ?? "").trim();
    if (inner) found.add(inner);
  }
  return [...found];
}

export function collectMarketingPersonalisationCorpus(input: {
  subject?: string;
  preheader?: string;
  messageBody?: string;
  content?: MarketingContentDocument | null;
}): string {
  const parts = [input.subject ?? "", input.preheader ?? "", input.messageBody ?? ""];
  if (input.content) {
    for (const block of input.content.blocks) {
      for (const value of Object.values(block.props)) {
        if (typeof value === "string") parts.push(value);
      }
    }
  }
  return parts.join("\n");
}

function splitName(full: string): { firstName: string; lastName: string; fullName: string } {
  const trimmed = full.trim();
  if (!trimmed) return { firstName: "", lastName: "", fullName: "" };
  const bits = trimmed.split(/\s+/);
  return {
    firstName: bits[0] ?? "",
    lastName: bits.slice(1).join(" "),
    fullName: trimmed,
  };
}

export function projectAllowlistedSampleValues(input: {
  name?: string;
  location?: string;
  productInterest?: string;
  extras?: Record<string, string>;
  senderName?: string;
}): Partial<Record<MarketingPersonalizationToken, string>> {
  const values: Partial<Record<MarketingPersonalizationToken, string>> = {};
  const names = splitName(input.name ?? "");
  if (names.firstName) values.firstName = names.firstName;
  if (names.lastName) values.lastName = names.lastName;
  if (names.fullName) values.fullName = names.fullName;
  if (input.location?.trim()) values.city = input.location.trim();
  if (input.productInterest?.trim()) values.product = input.productInterest.trim();
  for (const [token, raw] of Object.entries(input.extras ?? {})) {
    if (SENSITIVE.has(token)) continue;
    const canonical = resolveCanonicalPersonalizationToken(token);
    if (!canonical || canonical === "senderName") continue;
    if (raw?.trim()) values[canonical] = raw.trim();
  }
  if (input.senderName?.trim()) values.senderName = input.senderName.trim();
  return values;
}

export function buildMarketingPersonalisationCatalogue(input: {
  columnMap?: MarketingColumnMap | null;
  mappingConfirmed?: boolean;
  senderName?: string | null;
}): MarketingPersonalisationCatalogueEntry[] {
  const map = input.columnMap ?? { email: "" };
  const entries: MarketingPersonalisationCatalogueEntry[] = [];
  const seen = new Set<MarketingPersonalizationToken>();

  const add = (
    token: MarketingPersonalizationToken,
    source: MarketingPersonalisationCatalogueSource,
    mappedHeader: string | null,
  ) => {
    if (seen.has(token)) return;
    seen.add(token);
    const fallback = MARKETING_PERSONALIZATION_FALLBACKS[token] ?? "";
    const label = MARKETING_PERSONALISATION_LABELS[token];
    entries.push({
      token,
      label,
      source,
      mappedHeader,
      fallback,
      insertValue: `{{${token}}}`,
      searchable: `${token} ${label} ${mappedHeader ?? ""}`.toLowerCase(),
    });
  };

  if (map.name) {
    add("firstName", "mapped", map.name);
    add("lastName", "mapped", map.name);
    add("fullName", "mapped", map.name);
  }
  if (map.location) add("city", "mapped", map.location);
  if (map.productInterest) add("product", "mapped", map.productInterest);

  for (const [token, header] of Object.entries(map.extras ?? {})) {
    if (SENSITIVE.has(token)) continue;
    const canonical = resolveCanonicalPersonalizationToken(token);
    if (!canonical || canonical === "senderName") continue;
    if (header?.trim()) add(canonical, "mapped", header.trim());
  }

  add("senderName", "system", input.senderName?.trim() || null);
  return entries;
}

export function searchMarketingPersonalisationCatalogue(
  entries: MarketingPersonalisationCatalogueEntry[],
  query: string,
): MarketingPersonalisationCatalogueEntry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return entries;
  return entries.filter((entry) => entry.searchable.includes(needle));
}

export function mappedPersonalisationTokenNames(columnMap: MarketingColumnMap): string[] {
  return buildMarketingPersonalisationCatalogue({ columnMap, mappingConfirmed: true })
    .filter((entry) => entry.source === "mapped")
    .map((entry) => entry.token);
}

function tokenIsMapped(token: string, mapped: Set<string>): boolean {
  if (token === "senderName") return true;
  if (token === "firstName" || token === "lastName" || token === "fullName") {
    return mapped.has("firstName") || mapped.has("lastName") || mapped.has("fullName");
  }
  if (token === "company" || token === "companyName") {
    return mapped.has("company") || mapped.has("companyName");
  }
  return mapped.has(token);
}

export function inspectMarketingPersonalisationUsage(input: {
  subject?: string;
  preheader?: string;
  messageBody?: string;
  content?: MarketingContentDocument | null;
  mappedVariables?: string[];
  columnMap?: MarketingColumnMap | null;
  mappingConfirmed?: boolean;
}): MarketingPersonalisationInspection {
  const corpus = collectMarketingPersonalisationCorpus(input);
  const rawTokens = listAllMarketingMustacheTokens(corpus);
  const mapped = new Set(
    input.mappedVariables?.length
      ? input.mappedVariables
      : mappedPersonalisationTokenNames(input.columnMap ?? { email: "" }),
  );
  const unsupportedTokens: string[] = [];
  const usedAllowlisted = new Set<string>();

  for (const raw of rawTokens) {
    if (RESERVED.has(raw)) continue;
    const canonical = resolveCanonicalPersonalizationToken(raw);
    if (!canonical && !ALLOWED.has(raw)) {
      unsupportedTokens.push(raw);
      continue;
    }
    usedAllowlisted.add(canonical ?? raw);
  }

  const unresolvedTokens = [...usedAllowlisted].filter((token) => !tokenIsMapped(token, mapped));
  const missingFallbackTokens = [...usedAllowlisted].filter((token) => {
    if (!ALLOWED.has(token)) return false;
    const fallback = MARKETING_PERSONALIZATION_FALLBACKS[token as MarketingPersonalizationToken];
    return !String(fallback ?? "").trim();
  });

  const blockingUnsupported = unsupportedTokens.length > 0;
  const blockingUnresolved = Boolean(input.mappingConfirmed) && unresolvedTokens.length > 0;
  const blockingFallback = missingFallbackTokens.length > 0;

  return {
    usedTokens: [...usedAllowlisted],
    unsupportedTokens: [...new Set(unsupportedTokens)],
    unresolvedTokens,
    missingFallbackTokens,
    blocking: blockingUnsupported || blockingUnresolved || blockingFallback,
  };
}

export function resolvePersonalisationWithFallbacks(
  values: Partial<Record<MarketingPersonalizationToken, string>>,
): Record<MarketingPersonalizationToken, string> {
  const resolved = { ...MARKETING_PERSONALIZATION_FALLBACKS };
  for (const token of MARKETING_PERSONALIZATION_TOKENS) {
    const value = values[token];
    if (value != null && String(value).trim()) resolved[token] = String(value).trim();
  }
  if (!resolved.companyName && resolved.company) resolved.companyName = resolved.company;
  if (!resolved.company && resolved.companyName) resolved.company = resolved.companyName;
  return resolved;
}

export function insertPersonalisationTokenIntoText(text: string, token: string): string {
  const insert = `{{${token}}}`;
  if (!text.trim()) return insert;
  if (text.endsWith(" ")) return `${text}${insert}`;
  return `${text} ${insert}`;
}

const BLOCK_INSERT_KEYS: Record<string, string[]> = {
  header: ["title", "subtitle"],
  text: ["html", "text"],
  footer: ["text", "html"],
  disclaimer: ["text", "html"],
  highlight: ["html", "text", "title"],
  cta: ["label"],
  product_card: ["title", "body"],
  offer_card: ["title", "body"],
  columns: ["left", "right"],
  image: ["alt", "caption"],
  hero_image: ["alt", "caption"],
  image_text: ["html", "text", "caption"],
  contact: ["name"],
};

export function insertPersonalisationTokenIntoDocument(
  content: MarketingContentDocument,
  token: MarketingPersonalizationToken,
  blockId?: string | null,
): MarketingContentDocument {
  const target =
    content.blocks.find((block) => block.id === blockId) ??
    content.blocks.find((block) => block.type === "text" || block.type === "header") ??
    content.blocks[0];
  if (!target) return content;
  const keys = BLOCK_INSERT_KEYS[target.type] ?? ["text", "html", "title", "label"];
  const key = keys.find((candidate) => typeof target.props[candidate] === "string") ?? keys[0];
  const current = typeof target.props[key] === "string" ? String(target.props[key]) : "";
  return {
    version: 1,
    blocks: content.blocks.map((block) =>
      block.id === target.id
        ? { ...block, props: { ...block.props, [key]: insertPersonalisationTokenIntoText(current, token) } }
        : block,
    ),
  };
}

export function labelMarketingSampleRecipient(input: {
  sourceRowNumber?: number | null;
  values: Partial<Record<MarketingPersonalizationToken, string>>;
}): string {
  const name = input.values.fullName || [input.values.firstName, input.values.lastName].filter(Boolean).join(" ");
  const city = input.values.city;
  const product = input.values.product;
  const bits = [
    input.sourceRowNumber != null ? `Row ${input.sourceRowNumber}` : null,
    name || null,
    city || null,
    product || null,
  ].filter(Boolean);
  return bits.join(" · ") || "Eligible audience recipient";
}
