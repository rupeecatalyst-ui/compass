/**
 * CO-MARKETING-REDESIGN-003 — Audience eligibility scan.
 * Preview may paginate diagnostics. Approval/freeze scans the complete selected dataset.
 * Does not create Contacts or Opportunities.
 */

import {
  MARKETING_AUDIENCE_SCAN_MAX_ROWS,
  MARKETING_AUDIENCE_SCAN_PAGE_SIZE,
} from "@/constants/enterprise-marketing-engine/audience";
import { MARKETING_PHASE1_CAMPAIGN_AUDIENCE_CEILING } from "@/constants/enterprise-marketing-engine/hostinger-smtp";
import { evaluateFilterDefinition } from "@/lib/enterprise-marketing-engine/audience-filters";
import { readMarketingAudienceSegment } from "@/lib/enterprise-marketing-engine/audience-segment";
import {
  extractMappedRowIdentity,
  type MarketingConfirmedColumnMapping,
} from "@/lib/enterprise-marketing-engine/column-mapping";
import { isValidMarketingEmail } from "@/lib/enterprise-marketing-engine/data-quality";
import { normalizeMarketingLedgerEmail } from "@/lib/enterprise-marketing-engine/durability/identity";
import type {
  MarketingAudienceEstimate,
  MarketingDataSourcePort,
  MarketingDatasetSchema,
} from "@/lib/enterprise-marketing-engine/ports/data-source.port";
import type {
  MarketingEligibilityRules,
  MarketingFilterDefinition,
} from "@/types/enterprise-marketing-audience";
import type { MarketingColumnMap } from "@/types/enterprise-marketing-durability";
import { MARKETING_PERSONALISATION_SAMPLE_CAP } from "@/constants/enterprise-marketing-engine/personalisation";
import {
  labelMarketingSampleRecipient,
  projectAllowlistedSampleValues,
  type MarketingPersonalisationSampleRecipient,
} from "@/lib/enterprise-marketing-engine/personalisation-catalogue";

export type MarketingEligibilityScanPurpose = "preview" | "approval";

export type MarketingAudienceLimitStatus = "within_limit" | "over_limit";

/** Shown wherever an early ceiling stop must not be treated as the eligible audience. */
export const MARKETING_INCOMPLETE_AUDIENCE_COUNT_LABEL =
  "Exceeds the 2,000 limit. The final eligible count was not calculated.";

export function isIncompleteOverLimitAudienceScan(
  scan: { scanComplete?: boolean; audienceLimitStatus?: string } | null | undefined,
): boolean {
  return scan?.scanComplete === false && scan?.audienceLimitStatus === "over_limit";
}

export function marketingAudienceEligibleLabel(input: {
  scanComplete: boolean;
  audienceLimitStatus: MarketingAudienceLimitStatus;
  eligible: number | null;
}): string {
  if (isIncompleteOverLimitAudienceScan(input)) return MARKETING_INCOMPLETE_AUDIENCE_COUNT_LABEL;
  return input.eligible == null ? "Unavailable" : String(input.eligible);
}

export type MarketingEligibleRecipientDraft = {
  sourceRowNumber: number | null;
  sourceStableKey: string;
  normalizedEmail: string;
  recipientFingerprint: string;
  displayName: string | null;
  normalizedMobile: string | null;
  mappedAttributes: Record<string, string>;
};

export type MarketingEligibilityCounts = {
  totalRows: number;
  scannedRows: number;
  validEmails: number;
  invalidEmails: number;
  duplicates: number;
  suppressed: number;
  excludedByFilter: number;
  previouslyContacted: number;
  eligible: number;
};

export type MarketingEligibilityScanResult = {
  purpose: MarketingEligibilityScanPurpose;
  /** False when the approval scan stopped before the source dataset was exhausted. */
  scanComplete: boolean;
  audienceLimitStatus: MarketingAudienceLimitStatus;
  scanCapped: boolean;
  scanMaxRows: number | null;
  availableFields: string[];
  counts: MarketingEligibilityCounts;
  eligibleRecipients: MarketingEligibleRecipientDraft[];
  /** Allowlisted mapped fields only — never mobile, consent, or raw email. */
  sampleRecipients: MarketingPersonalisationSampleRecipient[];
  sampleDiagnostics: Array<{
    sourceRowNumber?: number;
    disposition:
      | "eligible"
      | "excluded"
      | "invalid"
      | "duplicate"
      | "suppressed"
      | "previously_contacted"
      | "already_assigned";
    issues: string[];
  }>;
  /** Set only for an approval scan of a governed segment. A preview never fills this. */
  segmentAllocation?: {
    mode: "next_unassigned";
    eligibleCap: number;
    complete: boolean;
    lastSourceRowNumber: number | null;
    excludedAssigned: number;
  } | null;
  notice: string;
};

export type MarketingEligibilityLookups = {
  isSuppressed: (input: {
    normalizedEmail: string;
    fingerprint: string;
    mobile: string;
    sourceStableKey: string;
    consentValue?: string | null;
  }) => boolean;
  isPreviouslyContacted: (normalizedEmail: string) => boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function defaultLookups(): MarketingEligibilityLookups {
  return {
    isSuppressed: () => false,
    isPreviouslyContacted: () => false,
  };
}

function columnsFromMap(map: MarketingColumnMap): {
  emailColumn: string | null;
  phoneColumn: string | null;
} {
  return {
    emailColumn: map.email || null,
    phoneColumn: map.mobile || null,
  };
}

export async function scanMarketingAudienceEligibility(input: {
  port: MarketingDataSourcePort;
  bindingId: string;
  datasetId: string;
  columnMap: MarketingColumnMap;
  mapping: MarketingConfirmedColumnMapping | { confirmed?: boolean };
  inclusion: MarketingFilterDefinition;
  exclusion: MarketingFilterDefinition;
  eligibilityRules: MarketingEligibilityRules & { excludePreviouslyContacted?: boolean };
  purpose: MarketingEligibilityScanPurpose;
  lookups?: MarketingEligibilityLookups;
  diagnosticLimit?: number;
  schema?: MarketingDatasetSchema;
  estimate?: MarketingAudienceEstimate | null;
  bypassCache?: boolean;
  /** Normalised emails already frozen for this workbook tab. Used only by a governed segment. */
  assignedEmails?: ReadonlySet<string>;
}): Promise<MarketingEligibilityScanResult> {
  if (!input.port.getSchema || !input.port.streamRows) {
    throw Object.assign(new Error("Data source port cannot stream rows"), {
      statusCode: 500,
      code: "SOURCE_PORT_INCOMPLETE",
    });
  }

  const mappingConfirmed = input.mapping.confirmed === true;
  if (input.purpose === "approval" && !mappingConfirmed) {
    throw Object.assign(
      new Error("Approval eligibility requires an explicitly confirmed column mapping"),
      { statusCode: 400, code: "MAPPING_NOT_CONFIRMED" },
    );
  }

  const schema =
    input.schema ??
    (await input.port.getSchema!(input.bindingId, input.datasetId, { bypassCache: input.bypassCache }));
  const estimate =
    input.estimate !== undefined
      ? input.estimate
      : input.port.estimateAudience
        ? await input.port.estimateAudience(input.bindingId, input.datasetId, {
            bypassCache: input.bypassCache,
          })
        : null;
  const columns = columnsFromMap(input.columnMap);
  const lookups = input.lookups ?? defaultLookups();
  const diagnosticLimit = input.diagnosticLimit ?? 25;
  const unlimited = input.purpose === "approval";
  const segment = unlimited ? readMarketingAudienceSegment(input.inclusion) : null;
  const segmentMode = segment != null;
  const scanCap = unlimited ? Number.POSITIVE_INFINITY : MARKETING_AUDIENCE_SCAN_MAX_ROWS;

  const counts: MarketingEligibilityCounts = {
    totalRows: estimate?.dataRowEstimate ?? 0,
    scannedRows: 0,
    validEmails: 0,
    invalidEmails: 0,
    duplicates: 0,
    suppressed: 0,
    excludedByFilter: 0,
    previouslyContacted: 0,
    eligible: 0,
  };
  const seenEmails = new Set<string>();
  const seenKeys = new Set<string>();
  const eligibleRecipients: MarketingEligibleRecipientDraft[] = [];
  const sampleRecipients: MarketingPersonalisationSampleRecipient[] = [];
  const sampleDiagnostics: MarketingEligibilityScanResult["sampleDiagnostics"] = [];
  let cursor: string | undefined;
  let scanCapped = false;
  let ceilingExceeded = false;
  let sourceRemainder = false;
  let segmentFilled = false;
  let excludedAssigned = 0;
  let lastSourceRowNumber: number | null = null;

  const pushDiagnostic = (
    sourceRowNumber: number | undefined,
    disposition: MarketingEligibilityScanResult["sampleDiagnostics"][number]["disposition"],
    issues: string[],
  ) => {
    if (sampleDiagnostics.length >= diagnosticLimit) return;
    sampleDiagnostics.push({ sourceRowNumber, disposition, issues });
  };

  while (counts.scannedRows < scanCap && !ceilingExceeded && !segmentFilled) {
    const remaining = unlimited
      ? MARKETING_AUDIENCE_SCAN_PAGE_SIZE
      : Math.min(MARKETING_AUDIENCE_SCAN_PAGE_SIZE, scanCap - counts.scannedRows);
    const page = await input.port.streamRows({
      bindingId: input.bindingId,
      datasetId: input.datasetId,
      cursor,
      limit: Math.max(1, remaining),
      bypassCache: input.bypassCache,
    });
    if (page.rows.length === 0) break;

    for (let i = 0; i < page.rows.length; i += 1) {
      if (!unlimited && counts.scannedRows >= scanCap) {
        scanCapped = true;
        break;
      }
      const row = page.rows[i]!;
      const sourceRowNumber = page.sourceRowNumbers?.[i] ?? null;
      counts.scannedRows += 1;
      if (sourceRowNumber != null) lastSourceRowNumber = sourceRowNumber;

      const included = evaluateFilterDefinition(row, input.inclusion, columns);
      const excluded = input.exclusion.rules.length
        ? evaluateFilterDefinition(row, input.exclusion, columns)
        : false;
      if (!included || excluded) {
        counts.excludedByFilter += 1;
        pushDiagnostic(sourceRowNumber ?? undefined, "excluded", [
          excluded ? "exclusion_match" : "filter_mismatch",
        ]);
        continue;
      }

      const identity = extractMappedRowIdentity(row, input.columnMap, sourceRowNumber);
      const email = identity.normalizedEmail ?? "";
      const hasEmail = Boolean(email);
      const validEmail = hasEmail && EMAIL_RE.test(email) && isValidMarketingEmail(email);

      if (validEmail) counts.validEmails += 1;
      else counts.invalidEmails += 1;

      if (input.eligibilityRules.requireValidEmailIfPresent || input.purpose === "approval") {
        if (!validEmail) {
          pushDiagnostic(sourceRowNumber ?? undefined, "invalid", [
            hasEmail ? "invalid_email" : "missing_email",
          ]);
          continue;
        }
      }

      if (input.eligibilityRules.requireIdentity && !identity.sourceStableKey && !validEmail) {
        pushDiagnostic(sourceRowNumber ?? undefined, "invalid", ["missing_identity"]);
        continue;
      }

      const fingerprint = `email:${normalizeMarketingLedgerEmail(email)}`;
      const duplicate =
        input.eligibilityRules.excludeDuplicatesInScan &&
        (seenEmails.has(email) || (identity.sourceStableKey && seenKeys.has(identity.sourceStableKey)));
      if (duplicate) {
        counts.duplicates += 1;
        pushDiagnostic(sourceRowNumber ?? undefined, "duplicate", ["duplicate_in_scan"]);
        continue;
      }

      if (
        lookups.isSuppressed({
          normalizedEmail: email,
          fingerprint,
          mobile: identity.mobile,
          sourceStableKey: identity.sourceStableKey,
          consentValue: identity.consent,
        })
      ) {
        counts.suppressed += 1;
        const issues = ["suppression_match"];
        if (!(identity.consent ?? "").trim()) issues.push("missing_or_negative_consent");
        pushDiagnostic(sourceRowNumber ?? undefined, "suppressed", issues);
        continue;
      }

      if (
        input.eligibilityRules.excludePreviouslyContacted &&
        lookups.isPreviouslyContacted(email)
      ) {
        counts.previouslyContacted += 1;
        pushDiagnostic(sourceRowNumber ?? undefined, "previously_contacted", ["previously_contacted"]);
        continue;
      }

      if (segmentMode && input.assignedEmails?.has(normalizeMarketingLedgerEmail(email))) {
        excludedAssigned += 1;
        pushDiagnostic(sourceRowNumber ?? undefined, "already_assigned", ["already_assigned"]);
        continue;
      }

      if (validEmail) {
        seenEmails.add(email);
        if (identity.sourceStableKey) seenKeys.add(identity.sourceStableKey);
      }

      counts.eligible += 1;
      pushDiagnostic(sourceRowNumber ?? undefined, "eligible", []);
      if (validEmail) {
        const values = projectAllowlistedSampleValues({
          name: identity.name,
          location: identity.location,
          productInterest: identity.productInterest,
          extras: identity.extras,
        });
        if (sampleRecipients.length < MARKETING_PERSONALISATION_SAMPLE_CAP) {
          const id = `row:${sourceRowNumber ?? counts.scannedRows}`;
          sampleRecipients.push({
            id,
            sourceRowNumber,
            label: labelMarketingSampleRecipient({ sourceRowNumber, values }),
            values,
            source: "audience_preview",
          });
        }
      }
      if (input.purpose === "approval" && validEmail) {
        eligibleRecipients.push({
          sourceRowNumber,
          sourceStableKey: identity.sourceStableKey || `row:${sourceRowNumber ?? counts.scannedRows}`,
          normalizedEmail: email,
          recipientFingerprint: fingerprint,
          displayName: identity.name || null,
          normalizedMobile: identity.mobile || null,
          mappedAttributes: {
            ...projectAllowlistedSampleValues({
              name: identity.name,
              location: identity.location,
              productInterest: identity.productInterest,
              extras: identity.extras,
            }),
          },
        });
      }
      if (segmentMode && segment && counts.eligible >= segment.eligibleCap) {
        segmentFilled = true;
        if (i + 1 < page.rows.length || page.nextCursor) sourceRemainder = true;
        break;
      }
      if (!segmentMode && unlimited && counts.eligible > MARKETING_PHASE1_CAMPAIGN_AUDIENCE_CEILING) {
        ceilingExceeded = true;
        if (i + 1 < page.rows.length || page.nextCursor) sourceRemainder = true;
        break;
      }
    }

    if (segmentFilled || ceilingExceeded || !page.nextCursor) break;
    cursor = page.nextCursor;
    if (!unlimited && counts.scannedRows >= scanCap) {
      scanCapped = true;
      break;
    }
  }

  if (!unlimited && counts.scannedRows >= MARKETING_AUDIENCE_SCAN_MAX_ROWS) scanCapped = true;
  if (estimate?.dataRowEstimate != null && counts.totalRows === 0) {
    counts.totalRows = estimate.dataRowEstimate;
  }
  if (counts.totalRows < counts.scannedRows) counts.totalRows = counts.scannedRows;

  const segmentComplete = segmentMode && (segmentFilled || (!sourceRemainder && !scanCapped));
  const scanComplete = segmentMode
    ? segmentComplete
    : unlimited && !scanCapped && !sourceRemainder;
  const audienceLimitStatus: MarketingAudienceLimitStatus =
    !segmentMode &&
    unlimited &&
    (ceilingExceeded || counts.eligible > MARKETING_PHASE1_CAMPAIGN_AUDIENCE_CEILING)
      ? "over_limit"
      : "within_limit";
  if (!scanComplete) eligibleRecipients.length = 0;

  return {
    purpose: input.purpose,
    scanComplete,
    audienceLimitStatus,
    scanCapped,
    scanMaxRows: unlimited ? null : MARKETING_AUDIENCE_SCAN_MAX_ROWS,
    availableFields: schema.headers,
    counts,
    eligibleRecipients,
    sampleRecipients,
    sampleDiagnostics,
    segmentAllocation: segment
      ? {
          mode: "next_unassigned",
          eligibleCap: segment.eligibleCap,
          complete: segmentComplete,
          lastSourceRowNumber,
          excludedAssigned,
        }
      : null,
    notice: segmentMode
      ? segmentComplete
        ? "Governed segment scan finished. Preview is not a frozen segment. Missing marketing permission is not consent."
        : "Governed segment scan did not finish. This result cannot be frozen."
      : unlimited
      ? sourceRemainder
        ? "Approval scan stopped once the phase-1 audience ceiling was exceeded. The remainder of the sheet was not read, the final eligible count was not calculated, and this result cannot be frozen."
        : "Approval scan covered the selected dataset through the phase-1 ceiling check. No Contacts or Opportunities were created. Personal fields are not returned to the browser."
      : mappingConfirmed
        ? "Preview diagnostics may be paginated. Confirm mapping, then run a full eligibility / freeze scan for approval."
        : "Using an unconfirmed mapping suggestion. Confirm the column mapping before freeze or campaign approval.",
  };
}
