/**
 * Audience-aware Tone Library resolver (CO-AI-104 DIE + CO-AI-112).
 * Customer catalogue and Partner catalogue are separate — never mixed.
 */

import { EAI_TONE_LIBRARY_VERSION } from "@/constants/enterprise-ai-platform/domain-governance";
import {
  EAI_PARTNER_TONE_LIBRARY,
  EAI_PARTNER_TONE_LIBRARY_VERSION,
} from "@/constants/enterprise-ai-platform/partner-tone-library";
import { EAI_TONE_LIBRARY } from "@/constants/enterprise-ai-platform/tone-library";
import type { EaiLanguageCode } from "@/types/enterprise-ai-multilingual";
import type { EaiToneAudience } from "@/types/enterprise-ai-wealth-partner-behaviour";
import type {
  EaiToneCategoryId,
  EaiToneEntry,
} from "@/types/enterprise-ai-domain-governance";
import type { EaiPersonaPackId } from "@/types/enterprise-ai-platform";
import { localiseEaiToneLines } from "../multilingual/localisation";

export function getEaiToneLibraryVersion(): string {
  return EAI_TONE_LIBRARY_VERSION;
}

export function getEaiPartnerToneLibraryVersion(): string {
  return EAI_PARTNER_TONE_LIBRARY_VERSION;
}

/** Wealth Partner and executive packs never use customer-facing tone. */
export function resolveEaiToneAudience(
  personaPackId?: EaiPersonaPackId | string,
): EaiToneAudience {
  if (personaPackId === "sarathi_customer") return "customer";
  return "partner";
}

export function listEaiToneEntries(audience: EaiToneAudience = "customer"): EaiToneEntry[] {
  return audience === "partner" ? [...EAI_PARTNER_TONE_LIBRARY] : [...EAI_TONE_LIBRARY];
}

export function getEaiToneEntry(
  categoryId: EaiToneCategoryId,
  audience: EaiToneAudience = "customer",
): EaiToneEntry | undefined {
  const library = audience === "partner" ? EAI_PARTNER_TONE_LIBRARY : EAI_TONE_LIBRARY;
  return library.find((e) => e.categoryId === categoryId);
}

/**
 * Resolve curated tone lines for a category + audience (+ optional language).
 * Returns empty string when category unknown — never invents copy.
 * Partner audience never falls back to customer lines.
 * AI-14: non-English uses curated localisation catalogues (behaviour unchanged).
 */
export function resolveEaiToneMessage(
  categoryId: EaiToneCategoryId,
  audience: EaiToneAudience = "customer",
  language: EaiLanguageCode = "en",
): string {
  const entry = getEaiToneEntry(categoryId, audience);
  if (!entry) return "";
  if (language === "en") return entry.lines.join("\n");
  return localiseEaiToneLines({
    categoryId,
    audience,
    language,
    englishLines: entry.lines,
  }).text;
}

export function validateEaiToneLibraryIntegrity(): string[] {
  const errors: string[] = [];
  for (const [label, library] of [
    ["customer", EAI_TONE_LIBRARY],
    ["partner", EAI_PARTNER_TONE_LIBRARY],
  ] as const) {
    const seen = new Set<string>();
    for (const entry of library) {
      if (seen.has(entry.categoryId)) {
        errors.push(`Duplicate ${label} tone category: ${entry.categoryId}`);
      }
      seen.add(entry.categoryId);
      if (!entry.lines.length) {
        errors.push(`${label} tone category ${entry.categoryId} has no lines`);
      }
      if (entry.lines.length > 2) {
        errors.push(`${label} tone category ${entry.categoryId} exceeds 2 lines`);
      }
      for (const line of entry.lines) {
        const words = line.trim().split(/\s+/).filter(Boolean);
        if (words.length > 12) {
          errors.push(
            `${label} tone line too long in ${entry.categoryId}: "${line}" (${words.length} words)`,
          );
        }
      }
    }
    if (library.length < 8) {
      errors.push(`${label} Tone Library missing required enterprise categories`);
    }
  }

  // Hard rule: partner catalogue must not contain known customer warm openers
  const customerWarmMarkers = [
    "buying a home matters",
    "let's explore your options",
    "let's reduce your borrowing cost",
  ];
  for (const entry of EAI_PARTNER_TONE_LIBRARY) {
    for (const line of entry.lines) {
      const lower = line.toLowerCase();
      if (customerWarmMarkers.some((m) => lower.includes(m))) {
        errors.push(
          `Partner tone must not reuse customer-facing copy: ${entry.categoryId} / "${line}"`,
        );
      }
    }
  }

  return errors;
}
