/**
 * Context sanitisation — strip unsafe fields from provider output (CO-AI-103).
 */

import { EAI_CONTEXT_SANITISATION_NOTES } from "@/constants/enterprise-ai-platform/context-intelligence";
import type { EaiSanitizedFact } from "@/types/enterprise-ai-platform";
import type { EaiContextProviderResult } from "@/types/enterprise-ai-context-intelligence";

const FORBIDDEN_KEY_PATTERN =
  /password|secret|token|api[_-]?key|authorization|cookie|ssn|aadhaar|aadhar|pan_full|raw_|__proto__|prisma|passwordHash/i;

const FORBIDDEN_VALUE_PATTERN =
  /\b(sk-[a-zA-Z0-9]{10,}|Bearer\s+[A-Za-z0-9._\-]+)\b/;

export function sanitiseEaiFact(fact: EaiSanitizedFact): EaiSanitizedFact | undefined {
  if (FORBIDDEN_KEY_PATTERN.test(fact.key)) return undefined;
  const value = String(fact.value ?? "").slice(0, 500);
  if (FORBIDDEN_VALUE_PATTERN.test(value)) return undefined;
  // Strip values that look like internal UUIDs used as sole content with id-like keys
  if (/^(id|internalId|dbId|uuid)$/i.test(fact.key)) return undefined;
  return {
    key: fact.key.slice(0, 120),
    value,
    provenance: fact.provenance,
  };
}

export function sanitiseEaiProviderResult(
  result: EaiContextProviderResult,
): {
  result: EaiContextProviderResult;
  notes: string[];
} {
  const notes: string[] = [...EAI_CONTEXT_SANITISATION_NOTES];
  const facts: EaiSanitizedFact[] = [];
  let dropped = 0;
  for (const fact of result.facts) {
    const clean = sanitiseEaiFact(fact);
    if (clean) facts.push(clean);
    else dropped += 1;
  }
  if (dropped > 0) {
    notes.push(`Dropped ${dropped} unsafe or internal fact(s) from ${result.providerId}`);
  }

  const refs = (result.refs ?? [])
    .filter((r) => r.registry && r.entityId)
    .map((r) => ({
      registry: String(r.registry).slice(0, 80),
      entityId: String(r.entityId).slice(0, 120),
      label: r.label ? String(r.label).slice(0, 120) : undefined,
    }));

  return {
    result: {
      ...result,
      facts,
      refs,
      summary: result.summary ? String(result.summary).slice(0, 800) : undefined,
    },
    notes,
  };
}

/** Reject accidental raw object dumps passed as facts. */
export function assertNoRawEnterprisePayload(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value !== "object") return true;
  const keys = Object.keys(value as object);
  const suspicious = ["password", "createdAt", "updatedAt", "_count", "prisma", "$$typeof"];
  return !suspicious.some((k) => keys.includes(k) && keys.length > 8);
}
