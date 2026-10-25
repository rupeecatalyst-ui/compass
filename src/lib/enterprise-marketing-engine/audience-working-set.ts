/**
 * In-process complete audience working sets for freeze reuse.
 * Preview scans (including an uncapped-looking 2,000-row cap) are never complete.
 */

import type { MarketingEligibilityScanResult } from "@/lib/enterprise-marketing-engine/eligibility-scan";
import type {
  MarketingEligibilityRules,
  MarketingFilterDefinition,
} from "@/types/enterprise-marketing-audience";
import type { MarketingColumnMap } from "@/types/enterprise-marketing-durability";

export const MARKETING_AUDIENCE_WORKING_SET_TTL_MS = 15 * 60 * 1000;

export type MarketingAudienceWorkingSetKeyInput = {
  organizationId: string;
  bindingId: string;
  datasetId: string;
  columnMap: MarketingColumnMap;
  inclusion: MarketingFilterDefinition;
  exclusion: MarketingFilterDefinition;
  eligibilityRules: MarketingEligibilityRules;
};

export type MarketingAudienceWorkingSet = MarketingAudienceWorkingSetKeyInput & {
  capturedAt: string;
  scan: MarketingEligibilityScanResult;
};

const sets = new Map<string, MarketingAudienceWorkingSet>();

export function audienceWorkingSetKey(input: MarketingAudienceWorkingSetKeyInput): string {
  return JSON.stringify({
    organizationId: input.organizationId,
    bindingId: input.bindingId,
    datasetId: input.datasetId,
    columnMap: input.columnMap,
    inclusion: input.inclusion,
    exclusion: input.exclusion,
    eligibilityRules: input.eligibilityRules,
  });
}

export function isCompleteFreezeWorkingSet(
  scan: MarketingEligibilityScanResult | null | undefined,
): scan is MarketingEligibilityScanResult {
  if (!scan) return false;
  return scan.purpose === "approval" && scan.scanCapped === false && scan.scanMaxRows == null;
}

export function rememberCompleteAudienceWorkingSet(
  input: MarketingAudienceWorkingSetKeyInput,
  scan: MarketingEligibilityScanResult,
): boolean {
  if (!isCompleteFreezeWorkingSet(scan)) return false;
  sets.set(audienceWorkingSetKey(input), {
    ...input,
    capturedAt: new Date().toISOString(),
    scan,
  });
  return true;
}

export function resolveCompleteAudienceWorkingSet(
  input: MarketingAudienceWorkingSetKeyInput,
  now = Date.now(),
  ttlMs = MARKETING_AUDIENCE_WORKING_SET_TTL_MS,
): MarketingAudienceWorkingSet | null {
  const row = sets.get(audienceWorkingSetKey(input));
  if (!row) return null;
  if (!isCompleteFreezeWorkingSet(row.scan)) {
    sets.delete(audienceWorkingSetKey(input));
    return null;
  }
  if (now - Date.parse(row.capturedAt) > ttlMs) return null;
  return row;
}

export function resetAudienceWorkingSets(): void {
  sets.clear();
}
