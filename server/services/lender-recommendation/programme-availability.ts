import type { CanonicalRecommendationProduct } from "@/types/canonical-lender-recommendation";

export type CanonicalProgrammeAvailabilityFields = {
  organizationId: string;
  productCode: string | null;
  isDeleted: boolean;
  enabled: boolean;
  isLivePublished: boolean;
  publicationState: string;
  completenessState: string;
  effectiveFrom: Date | string | null;
  effectiveUntil: Date | string | null;
};

function time(value: Date | string | null): number | null {
  if (value == null) return null;
  const result = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(result) ? result : Number.NaN;
}

/** Pure mirror of the database candidate gates, used for invariant verification. */
export function isCanonicalProgrammeAvailable(input: {
  programme: CanonicalProgrammeAvailabilityFields;
  organizationId: string;
  product: CanonicalRecommendationProduct;
  asOf: Date;
}): boolean {
  const { programme } = input;
  const from = time(programme.effectiveFrom);
  const until = time(programme.effectiveUntil);
  const now = input.asOf.getTime();
  return (
    programme.organizationId === input.organizationId &&
    programme.productCode === input.product &&
    !programme.isDeleted &&
    programme.enabled === true &&
    programme.isLivePublished === true &&
    programme.publicationState === "published" &&
    programme.completenessState === "complete" &&
    !Number.isNaN(from) &&
    !Number.isNaN(until) &&
    (from == null || from <= now) &&
    (until == null || until >= now)
  );
}
