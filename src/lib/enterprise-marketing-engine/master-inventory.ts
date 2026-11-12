/**
 * Read-only inventory of an authorised worksheet.
 * This is not a preview, not a segment, and not a frozen audience.
 * Missing marketing permission is counted as missing. It is never granted.
 */

import { MARKETING_SHEETS_PAGE_MAX_ROWS } from "@/constants/enterprise-marketing-engine/data-source";
import { evaluateFilterDefinition } from "@/lib/enterprise-marketing-engine/audience-filters";
import { columnsFromMap } from "@/lib/enterprise-marketing-engine/eligibility-scan";
import {
  extractMappedRowIdentity,
  type MarketingConfirmedColumnMapping,
} from "@/lib/enterprise-marketing-engine/column-mapping";
import {
  defaultMarketingConsentPolicy,
  interpretMarketingConsentValue,
  marketingMissingConsentIsGranted,
} from "@/lib/enterprise-marketing-engine/consent-policy";
import { isValidMarketingEmail } from "@/lib/enterprise-marketing-engine/data-quality";
import { normalizeMarketingLedgerEmail } from "@/lib/enterprise-marketing-engine/durability/identity";
import type { MarketingEligibilityLookups } from "@/lib/enterprise-marketing-engine/eligibility-scan";
import type { MarketingDataSourcePort } from "@/lib/enterprise-marketing-engine/ports/data-source.port";
import type { MarketingFilterDefinition } from "@/types/enterprise-marketing-audience";
import type { MarketingColumnMap } from "@/types/enterprise-marketing-durability";

export type MarketingMasterInventoryCounts = {
  sourceRecordsExamined: number;
  uniqueEmails: number;
  duplicates: number;
  missingOrInvalidEmail: number;
  suppressedOrUnsubscribed: number;
  permissionGranted: number;
  permissionMissing: number;
  permissionUnknown: number;
  permissionWithdrawn: number;
  technicallyEligible: number;
  /** Technically eligible rows that also have verifiable granted permission. */
  authorisedForSending: number;
  excludedByFilter: number;
};

export type MarketingMasterInventory = {
  complete: boolean;
  resumeCursor: string | null;
  lastSourceRowNumber: number | null;
  code: string | null;
  notice: string;
  counts: MarketingMasterInventoryCounts;
};

function emptyCounts(): MarketingMasterInventoryCounts {
  return {
    sourceRecordsExamined: 0,
    uniqueEmails: 0,
    duplicates: 0,
    missingOrInvalidEmail: 0,
    suppressedOrUnsubscribed: 0,
    permissionGranted: 0,
    permissionMissing: 0,
    permissionUnknown: 0,
    permissionWithdrawn: 0,
    technicallyEligible: 0,
    authorisedForSending: 0,
    excludedByFilter: 0,
  };
}

export async function analyseMarketingMasterSource(input: {
  port: MarketingDataSourcePort;
  bindingId: string;
  datasetId: string;
  columnMap: MarketingColumnMap;
  mapping?: MarketingConfirmedColumnMapping | { confirmed?: boolean } | null;
  inclusion: MarketingFilterDefinition;
  exclusion: MarketingFilterDefinition;
  lookups?: MarketingEligibilityLookups;
  bypassCache?: boolean;
  /** Continue after an incomplete inventory. Counts start again from this cursor. */
  resumeCursor?: string | null;
}): Promise<MarketingMasterInventory> {
  if (!input.port.streamRows) {
    throw Object.assign(new Error("Data source port cannot stream rows"), {
      statusCode: 500,
      code: "SOURCE_PORT_INCOMPLETE",
    });
  }
  const columns = columnsFromMap(input.columnMap);
  const policy = defaultMarketingConsentPolicy(input.bindingId);
  const lookups = input.lookups;
  const seen = new Set<string>();
  const counts = emptyCounts();
  let cursor = input.resumeCursor || undefined;
  let lastSourceRowNumber: number | null = null;
  let refreshThisPage = input.bypassCache === true;
  const streamRows = input.port.streamRows.bind(input.port);

  try {
    while (true) {
      const page = await streamRows({
        bindingId: input.bindingId,
        datasetId: input.datasetId,
        cursor,
        limit: MARKETING_SHEETS_PAGE_MAX_ROWS,
        bypassCache: refreshThisPage,
      });
      refreshThisPage = false;
      if (page.rows.length === 0) break;
      for (let i = 0; i < page.rows.length; i += 1) {
        const row = page.rows[i]!;
        const sourceRowNumber = page.sourceRowNumbers?.[i] ?? null;
        if (sourceRowNumber != null) lastSourceRowNumber = sourceRowNumber;
        counts.sourceRecordsExamined += 1;
        const identity = extractMappedRowIdentity(row, input.columnMap, sourceRowNumber);
        const permission = interpretMarketingConsentValue(identity.consent, policy);
        if (permission === "granted") counts.permissionGranted += 1;
        else if (permission === "missing") counts.permissionMissing += 1;
        else if (permission === "withdrawn") counts.permissionWithdrawn += 1;
        else counts.permissionUnknown += 1;

        const included = evaluateFilterDefinition(row, input.inclusion, columns);
        const excluded = input.exclusion.rules.length
          ? evaluateFilterDefinition(row, input.exclusion, columns)
          : false;
        if (!included || excluded) {
          counts.excludedByFilter += 1;
          continue;
        }

        const email = identity.normalizedEmail ?? "";
        const validEmail = Boolean(email) && isValidMarketingEmail(email);
        if (!validEmail) {
          counts.missingOrInvalidEmail += 1;
          continue;
        }
        const normalized = normalizeMarketingLedgerEmail(email);
        if (seen.has(normalized)) {
          counts.duplicates += 1;
          continue;
        }
        seen.add(normalized);
        counts.uniqueEmails += 1;

        const suppressed = lookups?.isSuppressed({
          normalizedEmail: normalized,
          fingerprint: `email:${normalized}`,
          mobile: identity.mobile,
          sourceStableKey: identity.sourceStableKey,
          consentValue: identity.consent,
        });
        if (suppressed) {
          counts.suppressedOrUnsubscribed += 1;
          continue;
        }
        counts.technicallyEligible += 1;
        if (permission === "granted") counts.authorisedForSending += 1;
      }
      if (!page.nextCursor) {
        cursor = undefined;
        break;
      }
      cursor = page.nextCursor;
    }
  } catch (error) {
    const code = (error as { code?: string })?.code ?? "MASTER_INVENTORY_INCOMPLETE";
    return {
      complete: false,
      resumeCursor: cursor ?? null,
      lastSourceRowNumber,
      code,
      notice:
        "Master analysis did not finish. These counts are incomplete and cannot approve a segment. Missing marketing permission is not consent.",
      counts,
    };
  }

  const permissionGap = counts.technicallyEligible - counts.authorisedForSending;
  return {
    complete: true,
    resumeCursor: null,
    lastSourceRowNumber,
    code: null,
    notice:
      permissionGap > 0
        ? "Master analysis finished. Missing or unknown permission is not consent granted and is outside the authorised sending population."
        : "Master analysis finished. A preview is not this analysis, and this analysis is not a frozen audience.",
    counts: {
      ...counts,
      uniqueEmails: seen.size,
    },
  };
}

export function marketingInventoryAllowsSend(inventory: MarketingMasterInventory): boolean {
  return (
    inventory.complete === true &&
    inventory.counts.authorisedForSending > 0 &&
    marketingMissingConsentIsGranted() === false
  );
}
