/**
 * Governed audience segment. Optional clause on the existing filter definition.
 * Does not create a second audience engine and does not grant marketing permission.
 */

import { MARKETING_PHASE1_CAMPAIGN_AUDIENCE_CEILING } from "@/constants/enterprise-marketing-engine/hostinger-smtp";
import type {
  MarketingAudienceSegmentClause,
  MarketingFilterDefinition,
} from "@/types/enterprise-marketing-audience";
import { normalizeMarketingLedgerEmail } from "@/lib/enterprise-marketing-engine/durability/identity";

export function readMarketingAudienceSegment(
  definition: MarketingFilterDefinition | null | undefined,
): MarketingAudienceSegmentClause | null {
  if (!definition || definition.segment == null) return null;
  const mode = definition.segment.mode;
  if (mode !== "next_unassigned") {
    throw Object.assign(new Error("Audience segment mode is not supported"), {
      statusCode: 400,
      code: "SEGMENT_MODE_UNSUPPORTED",
    });
  }
  const requested = Number(definition.segment.eligibleCap);
  const eligibleCap = Math.min(
    MARKETING_PHASE1_CAMPAIGN_AUDIENCE_CEILING,
    Math.max(1, Number.isFinite(requested) ? Math.floor(requested) : MARKETING_PHASE1_CAMPAIGN_AUDIENCE_CEILING),
  );
  return { mode: "next_unassigned", eligibleCap };
}

export function normalizeAssignedEmailSet(emails: Iterable<string>): Set<string> {
  const assigned = new Set<string>();
  for (const email of emails) {
    const normalized = normalizeMarketingLedgerEmail(email);
    if (normalized) assigned.add(normalized);
  }
  return assigned;
}
