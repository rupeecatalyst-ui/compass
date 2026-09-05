/**
 * CO-MARKETING-REDESIGN-002 — Fail-closed durability errors.
 */

export const MARKETING_DURABLE_PERSISTENCE_UNAVAILABLE = "DURABLE_PERSISTENCE_UNAVAILABLE" as const;
export const MARKETING_MEMORY_FALLBACK_FORBIDDEN = "MEMORY_FALLBACK_FORBIDDEN" as const;

export function marketingDurabilityUnavailable(detail?: string): Error {
  return Object.assign(
    new Error(
      detail?.trim() ||
        "Marketing durable persistence is unavailable. Production must not fall back to memory.",
    ),
    { statusCode: 503, code: MARKETING_DURABLE_PERSISTENCE_UNAVAILABLE },
  );
}

export function marketingMemoryFallbackForbidden(): Error {
  return Object.assign(
    new Error("Production Marketing operations must not silently fall back to in-memory stores"),
    { statusCode: 503, code: MARKETING_MEMORY_FALLBACK_FORBIDDEN },
  );
}
