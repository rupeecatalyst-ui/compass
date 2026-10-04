import { z } from "zod";
import type { OpportunityAssessmentSourceFingerprint } from "@/types/opportunity-assessment";

export const opportunityAssessmentSourceFingerprintSchema = z
  .object({
    opportunityRowVersion: z.number().int().nonnegative().nullable(),
    contactUpdatedAt: z.string().datetime({ offset: true }).nullable(),
    companyUpdatedAt: z.string().datetime({ offset: true }).nullable(),
    compassAssessmentUpdatedAt: z.string().datetime({ offset: true }).nullable(),
  })
  .strict();

export type OpportunityAssessmentSourceFingerprintInput = {
  opportunityRowVersion?: number | null;
  contactUpdatedAt?: string | Date | null;
  companyUpdatedAt?: string | Date | null;
  compassAssessmentUpdatedAt?: string | Date | null;
};

function isoOrNull(value: string | Date | null | undefined, field: string): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) {
      throw new Error(`${field} is not a valid fingerprint timestamp.`);
    }
    return value.toISOString();
  }
  if (typeof value !== "string") {
    throw new Error(`${field} is not a valid fingerprint timestamp.`);
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`${field} is not a valid fingerprint timestamp.`);
  }
  return parsed.toISOString();
}

function rowVersionOrNull(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("opportunityRowVersion must be a non-negative integer or null.");
  }
  return value;
}

export function buildOpportunityAssessmentSourceFingerprint(
  input: OpportunityAssessmentSourceFingerprintInput = {},
): OpportunityAssessmentSourceFingerprint {
  return {
    opportunityRowVersion: rowVersionOrNull(input.opportunityRowVersion),
    contactUpdatedAt: isoOrNull(input.contactUpdatedAt, "contactUpdatedAt"),
    companyUpdatedAt: isoOrNull(input.companyUpdatedAt, "companyUpdatedAt"),
    compassAssessmentUpdatedAt: isoOrNull(input.compassAssessmentUpdatedAt, "compassAssessmentUpdatedAt"),
  };
}

export function serializeOpportunityAssessmentSourceFingerprint(
  fingerprint: OpportunityAssessmentSourceFingerprint,
): string {
  return JSON.stringify({
    opportunityRowVersion: fingerprint.opportunityRowVersion,
    contactUpdatedAt: fingerprint.contactUpdatedAt,
    companyUpdatedAt: fingerprint.companyUpdatedAt,
    compassAssessmentUpdatedAt: fingerprint.compassAssessmentUpdatedAt,
  });
}

export function opportunityAssessmentSourceFingerprintsEqual(
  left: OpportunityAssessmentSourceFingerprint,
  right: OpportunityAssessmentSourceFingerprint,
): boolean {
  return (
    serializeOpportunityAssessmentSourceFingerprint(left) ===
    serializeOpportunityAssessmentSourceFingerprint(right)
  );
}
