/**
 * CO-MARKETING-REDESIGN-003 — Explicit column mapping.
 * Suggestions are heuristics only. Freeze / approval require operator confirmation.
 * Does not create Contacts or Opportunities.
 */

import {
  MARKETING_SHEETS_EMAIL_HEADER_ALIASES,
  MARKETING_SHEETS_EXTERNAL_KEY_HEADER_ALIASES,
  MARKETING_SHEETS_PHONE_HEADER_ALIASES,
} from "@/constants/enterprise-marketing-engine/data-source";
import { MARKETING_PERSONALIZATION_TOKENS } from "@/constants/enterprise-marketing-engine/content";
import { findHeaderByAliases } from "@/lib/enterprise-marketing-engine/data-quality";
import {
  assertMarketingColumnMap,
  buildMarketingSourceStableKey,
  normalizeMarketingLedgerEmail,
} from "@/lib/enterprise-marketing-engine/durability/identity";
import type {
  MarketingColumnMap,
  MarketingConfirmedColumnMapping,
} from "@/types/enterprise-marketing-durability";
import type { MarketingChannel } from "@/constants/enterprise-marketing-engine/lifecycle";

export const MARKETING_NAME_HEADER_ALIASES = [
  "name",
  "full name",
  "fullname",
  "contact name",
] as const;

export const MARKETING_LOCATION_HEADER_ALIASES = [
  "city",
  "location",
  "city/town",
  "town",
] as const;

export const MARKETING_PRODUCT_INTEREST_HEADER_ALIASES = [
  "product",
  "product interest",
  "interested product",
  "profession",
] as const;

export const MARKETING_CONSENT_HEADER_ALIASES = [
  "consent",
  "opt in",
  "opt-in",
  "opted in",
  "marketing consent",
] as const;

const ALLOWED_EXTRAS = new Set<string>(MARKETING_PERSONALIZATION_TOKENS);

export type MarketingColumnMapSuggestion = {
  suggested: MarketingColumnMap;
  unmatchedHeaders: string[];
  notice: string;
};

export type { MarketingConfirmedColumnMapping };

function emptyMap(): MarketingColumnMap {
  return {
    email: "",
    name: null,
    mobile: null,
    location: null,
    productInterest: null,
    consent: null,
    sourceStableKey: null,
    extras: {},
  };
}

export function suggestMarketingColumnMap(headers: string[]): MarketingColumnMapSuggestion {
  const suggested: MarketingColumnMap = {
    email: findHeaderByAliases(headers, MARKETING_SHEETS_EMAIL_HEADER_ALIASES) ?? "",
    name: findHeaderByAliases(headers, MARKETING_NAME_HEADER_ALIASES),
    mobile: findHeaderByAliases(headers, MARKETING_SHEETS_PHONE_HEADER_ALIASES),
    location: findHeaderByAliases(headers, MARKETING_LOCATION_HEADER_ALIASES),
    productInterest: findHeaderByAliases(headers, MARKETING_PRODUCT_INTEREST_HEADER_ALIASES),
    consent: findHeaderByAliases(headers, MARKETING_CONSENT_HEADER_ALIASES),
    sourceStableKey: findHeaderByAliases(headers, MARKETING_SHEETS_EXTERNAL_KEY_HEADER_ALIASES),
    extras: {},
  };
  const used = new Set(
    [
      suggested.email,
      suggested.name,
      suggested.mobile,
      suggested.location,
      suggested.productInterest,
      suggested.consent,
      suggested.sourceStableKey,
    ]
      .filter(Boolean)
      .map((h) => h!.toLowerCase()),
  );
  const unmatchedHeaders = headers.filter((h) => !used.has(h.trim().toLowerCase()));
  return {
    suggested,
    unmatchedHeaders,
    notice:
      "These mappings are suggestions from header names. Confirm the mapping before eligibility freeze or campaign approval.",
  };
}

export function isMarketingColumnMapConfirmed(
  mapping:
    | MarketingConfirmedColumnMapping
    | { confirmed?: boolean; map?: MarketingColumnMap }
    | null
    | undefined,
): mapping is MarketingConfirmedColumnMapping {
  return Boolean(mapping && mapping.confirmed === true && mapping.map);
}

function headerExists(headers: string[], header: string | null | undefined): boolean {
  if (!header?.trim()) return false;
  const needle = header.trim().toLowerCase();
  return headers.some((h) => h.trim().toLowerCase() === needle);
}

export function assertConfirmedMarketingColumnMap(input: {
  mapping: MarketingConfirmedColumnMapping | { confirmed?: boolean; map?: MarketingColumnMap } | null;
  headers: string[];
  channel?: MarketingChannel | null;
}): MarketingConfirmedColumnMapping {
  if (!isMarketingColumnMapConfirmed(input.mapping)) {
    throw Object.assign(
      new Error("Column mapping must be explicitly confirmed before approval or freeze"),
      { statusCode: 400, code: "MAPPING_NOT_CONFIRMED" },
    );
  }
  const map = input.mapping.map;
  assertMarketingColumnMap(map);
  if (!headerExists(input.headers, map.email)) {
    throw Object.assign(new Error(`Email mapping "${map.email}" is not a current sheet header`), {
      statusCode: 400,
      code: "INVALID_COLUMN_MAP",
    });
  }
  const optional: Array<keyof MarketingColumnMap> = [
    "name",
    "mobile",
    "location",
    "productInterest",
    "consent",
    "sourceStableKey",
  ];
  for (const key of optional) {
    const header = map[key];
    if (typeof header === "string" && header.trim() && !headerExists(input.headers, header)) {
      throw Object.assign(new Error(`Mapped column "${header}" is not a current sheet header`), {
        statusCode: 400,
        code: "INVALID_COLUMN_MAP",
      });
    }
  }
  if (map.extras) {
    for (const [token, header] of Object.entries(map.extras)) {
      if (!ALLOWED_EXTRAS.has(token)) {
        throw Object.assign(
          new Error(`Personalisation attribute "${token}" is not on the allowlist`),
          { statusCode: 400, code: "INVALID_COLUMN_MAP" },
        );
      }
      if (header.trim() && !headerExists(input.headers, header)) {
        throw Object.assign(new Error(`Extra mapping "${header}" is not a current sheet header`), {
          statusCode: 400,
          code: "INVALID_COLUMN_MAP",
        });
      }
    }
  }
  if ((input.channel ?? "EMAIL") === "EMAIL" && !map.email.trim()) {
    throw Object.assign(new Error("Email campaigns require a confirmed email column mapping"), {
      statusCode: 400,
      code: "EMAIL_MAPPING_REQUIRED",
    });
  }
  return input.mapping;
}

export function confirmMarketingColumnMap(input: {
  map: MarketingColumnMap;
  headers: string[];
  suggested?: MarketingColumnMap;
  confirmedByUserId?: string | null;
  channel?: MarketingChannel | null;
  confirmedAt?: string;
}): MarketingConfirmedColumnMapping {
  const confirmed: MarketingConfirmedColumnMapping = {
    map: {
      ...emptyMap(),
      ...input.map,
      extras: { ...(input.map.extras ?? {}) },
    },
    confirmed: true,
    confirmedAt: input.confirmedAt ?? new Date().toISOString(),
    confirmedByUserId: input.confirmedByUserId ?? null,
    suggested: input.suggested ?? suggestMarketingColumnMap(input.headers).suggested,
  };
  return assertConfirmedMarketingColumnMap({
    mapping: confirmed,
    headers: input.headers,
    channel: input.channel,
  });
}

export function readMappedCell(
  row: Record<string, unknown>,
  header: string | null | undefined,
): string {
  if (!header?.trim()) return "";
  const exact = row[header];
  if (exact != null && String(exact).trim()) return String(exact).trim();
  const needle = header.trim().toLowerCase();
  for (const [key, value] of Object.entries(row)) {
    if (key.trim().toLowerCase() === needle && value != null) return String(value).trim();
  }
  return "";
}

export function extractMappedRowIdentity(
  row: Record<string, unknown>,
  map: MarketingColumnMap,
  sourceRowNumber?: number | null,
): {
  emailRaw: string;
  normalizedEmail: string | null;
  name: string;
  mobile: string;
  location: string;
  productInterest: string;
  consent: string;
  sourceStableKey: string;
  extras: Record<string, string>;
} {
  const emailRaw = readMappedCell(row, map.email);
  const mappedKey = readMappedCell(row, map.sourceStableKey);
  let sourceStableKey = "";
  try {
    sourceStableKey = buildMarketingSourceStableKey({
      mappedKey: mappedKey || null,
      sourceRowNumber: sourceRowNumber ?? null,
    });
  } catch {
    sourceStableKey = sourceRowNumber != null ? `row:${sourceRowNumber}` : "";
  }
  const extras: Record<string, string> = {};
  for (const [token, header] of Object.entries(map.extras ?? {})) {
    const value = readMappedCell(row, header);
    if (value) extras[token] = value;
  }
  const normalized = emailRaw ? normalizeMarketingLedgerEmail(emailRaw) : "";
  return {
    emailRaw,
    normalizedEmail: normalized || null,
    name: readMappedCell(row, map.name),
    mobile: readMappedCell(row, map.mobile),
    location: readMappedCell(row, map.location),
    productInterest: readMappedCell(row, map.productInterest),
    consent: readMappedCell(row, map.consent),
    sourceStableKey,
    extras,
  };
}
