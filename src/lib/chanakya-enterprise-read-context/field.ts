/**
 * CO-CHANAKYA-ENTERPRISE-READ-CONTEXT-002 — Provenance field helpers.
 */

import {
  CHANAKYA_FIELD_AVAILABILITY,
  type ChanakyaFieldAvailability,
  type ChanakyaProvenanceField,
  type ChanakyaEnterpriseReadDomain,
} from "@/types/chanakya-enterprise-read-context";

export function fieldAvailable<T>(
  value: T,
  sourceDomain: ChanakyaEnterpriseReadDomain | "system",
  provenance: string,
  confidence?: number | null,
): ChanakyaProvenanceField<T> {
  return {
    value,
    availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    sourceDomain,
    provenance,
    confidence: confidence ?? null,
  };
}

export function fieldMissing(
  sourceDomain: ChanakyaEnterpriseReadDomain | "system",
  provenance: string,
  availability: ChanakyaFieldAvailability = CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
  note?: string,
): ChanakyaProvenanceField<null> {
  return {
    value: null,
    availability,
    sourceDomain,
    provenance,
    confidence: null,
    note: note ?? null,
  };
}

export function displayOrMarker(value: unknown): {
  text: string | null;
  availability: ChanakyaFieldAvailability;
} {
  if (value == null) {
    return { text: null, availability: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE };
  }
  const s = String(value).trim();
  if (!s) {
    return { text: null, availability: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE };
  }
  return { text: s, availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE };
}
