/**
 * CO-MARKETING-REDESIGN-003 — Audience eligibility scan.
 * Preview may paginate diagnostics. Approval/freeze scans the complete selected dataset.
 * Does not create Contacts or Opportunities.
 */

import {
  MARKETING_AUDIENCE_SCAN_MAX_ROWS,
  MARKETING_AUDIENCE_SCAN_PAGE_SIZE,
} from "@/constants/enterprise-marketing-engine/audience";
import { evaluateFilterDefinition } from "@/lib/enterprise-marketing-engine/audience-filters";
import {
  extractMappedRowIdentity,
  type MarketingConfirmedColumnMapping,
} from "@/lib/enterprise-marketing-engine/column-mapping";
import { isValidMarketingEmail } from "@/lib/enterprise-marketing-engine/data-quality";
import { normalizeMarketingLedgerEmail } from "@/lib/enterprise-marketing-engine/durability/identity";
import type { MarketingDataSourcePort } from "@/lib/enterprise-marketing-engine/ports/data-source.port";
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
      | "previously_contacted";
    issues: string[];
  }>;
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

  const schema = await input.port.getSchema(input.bindingId, input.datasetId);
  const estimate = input.port.estimateAudience
    ? await input.port.estimateAudience(input.bindingId, input.datasetId)
    : null;
  const columns = columnsFromMap(input.columnMap);
  const lookups = input.lookups ?? defaultLookups();
  const diagnosticLimit = input.diagnosticLimit ?? 25;
  const unlimited = input.purpose === "approval";
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

  const pushDiagnostic = (
    sourceRowNumber: number | undefined,
    disposition: MarketingEligibilityScanResult["sampleDiagnostics"][number]["disposition"],
    issues: string[],
  ) => {
    if (sampleDiagnostics.length >= diagnosticLimit) return;
    sampleDiagnostics.push({ sourceRowNumber, disposition, issues });
  };

  while (counts.scannedRows < scanCap) {
    const remaining = unlimited
      ? MARKETING_AUDIENCE_SCAN_PAGE_SIZE
      : Math.min(MARKETING_AUDIENCE_SCAN_PAGE_SIZE, scanCap - counts.scannedRows);
    const page = await input.port.streamRows({
      bindingId: input.bindingId,
      datasetId: input.datasetId,
      cursor,
      limit: Math.max(1, remaining),
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
    }

    if (!page.nextCursor) break;
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

  return {
    purpose: input.purpose,
    scanCapped,
    scanMaxRows: unlimited ? null : MARKETING_AUDIENCE_SCAN_MAX_ROWS,
    availableFields: schema.headers,
    counts,
    eligibleRecipients,
    sampleRecipients,
    sampleDiagnostics,
    notice: unlimited
      ? "Approval scan covered the complete selected dataset. No Contacts or Opportunities were created. Personal fields are not returned to the browser."
      : mappingConfirmed
        ? "Preview diagnostics may be paginated. Confirm mapping, then run a full eligibility / freeze scan for approval."
        : "Using an unconfirmed mapping suggestion. Confirm the column mapping before freeze or campaign approval.",
  };
}
