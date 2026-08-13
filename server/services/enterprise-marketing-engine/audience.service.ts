/**
 * CO-MARKETING-MKT-03 — Marketing Audience Engine.
 * Definitions + preview eligibility over external Sheets / fixture.
 * Never mirrors rows · never creates Contacts / Opportunities / Leads · never sends.
 */

import {
  ENTERPRISE_MARKETING_AUDIENCE_IMPORT_ENABLED,
} from "@/constants/enterprise-marketing-engine";
import {
  MARKETING_AUDIENCE_SCAN_MAX_ROWS,
  MARKETING_AUDIENCE_SCAN_PAGE_SIZE,
} from "@/constants/enterprise-marketing-engine/audience";
import { evaluateFilterDefinition } from "@/lib/enterprise-marketing-engine/audience-filters";
import {
  assessMarketingRowQuality,
  buildMarketingRecipientFingerprint,
  detectMarketingSheetColumns,
  isValidMarketingEmail,
  normalizeMarketingPhone,
} from "@/lib/enterprise-marketing-engine/data-quality";
import { EnterpriseMarketingSafetyError } from "@/lib/enterprise-marketing-engine/safety";
import type {
  MarketingAudienceDefinition,
  MarketingAudiencePreviewResult,
  MarketingEligibilityRules,
  MarketingFilterDefinition,
  MarketingSuppressionPolicy,
} from "@/types/enterprise-marketing-audience";
import { recordMarketingAuditEvent } from "./audit";
import { marketingAudienceDefinitionStore } from "./audience-definition-store";
import { marketingDataSourceService } from "./data-source.service";
import { marketingSuppressionStore } from "./suppression-store";

const SCAN_MAX = MARKETING_AUDIENCE_SCAN_MAX_ROWS;
function assertAudienceStaysNonOperational() {
  // Audience definition/preview must never import rows. Module-level handoff /
  // execution flags belong to other services and must not disable this desk.
  if (ENTERPRISE_MARKETING_AUDIENCE_IMPORT_ENABLED) {
    throw new EnterpriseMarketingSafetyError("audience.import");
  }
}

function orgId(actorOrg?: string | null) {
  return marketingDataSourceService.resolveOrganizationId(actorOrg);
}

/** Match suppression across external-key / email / phone identity forms. */
function suppressionCandidates(quality: {
  fingerprint: string | null;
  email?: string | null;
  phone?: string | null;
  externalKey?: string | null;
}): string[] {
  const set = new Set<string>();
  if (quality.fingerprint) set.add(quality.fingerprint.toLowerCase());
  const emailFp = buildMarketingRecipientFingerprint({
    email: quality.email && isValidMarketingEmail(quality.email) ? quality.email : null,
    phone: null,
    externalKey: null,
  });
  const phoneFp = buildMarketingRecipientFingerprint({
    email: null,
    phone: quality.phone,
    externalKey: null,
  });
  const extFp = buildMarketingRecipientFingerprint({
    email: null,
    phone: null,
    externalKey: quality.externalKey,
  });
  if (emailFp) set.add(emailFp.toLowerCase());
  if (phoneFp) set.add(phoneFp.toLowerCase());
  if (extFp) set.add(extFp.toLowerCase());
  const digits = normalizeMarketingPhone(quality.phone ?? null);
  if (digits) set.add(`phone:${digits}`);
  return [...set];
}

async function evaluateAudiencePreview(input: {
  organizationId: string;
  bindingId: string;
  datasetId: string;
  filterDefinition: MarketingFilterDefinition;
  suppressionPolicy: MarketingSuppressionPolicy;
  eligibilityRules: MarketingEligibilityRules;
  audienceId?: string | null;
}): Promise<MarketingAudiencePreviewResult> {
  assertAudienceStaysNonOperational();
  const port = marketingDataSourceService.getPort(input.organizationId);
  if (!port.getSchema || !port.streamRows) {
    throw new EnterpriseMarketingSafetyError("audience.sourcePortIncomplete");
  }

  const schema = await port.getSchema(input.bindingId, input.datasetId);
  const columns = detectMarketingSheetColumns(schema.headers);
  const estimate = port.estimateAudience
    ? await port.estimateAudience(input.bindingId, input.datasetId)
    : null;

  const counts = {
    scanned: 0,
    eligible: 0,
    excludedByFilter: 0,
    invalid: 0,
    duplicate: 0,
    suppressed: 0,
  };
  const seen = new Set<string>();
  const sampleDiagnostics: MarketingAudiencePreviewResult["sampleDiagnostics"] = [];
  let cursor: string | undefined;
  let scanCapped = false;

  while (counts.scanned < SCAN_MAX) {
    const remaining = SCAN_MAX - counts.scanned;
    const pageSize = Math.min(MARKETING_AUDIENCE_SCAN_PAGE_SIZE, remaining);
    const page = await port.streamRows({
      bindingId: input.bindingId,
      datasetId: input.datasetId,
      cursor,
      limit: pageSize,
    });
    if (page.rows.length === 0) break;

    for (let i = 0; i < page.rows.length; i += 1) {
      const row = page.rows[i]!;
      const sourceRowNumber = page.sourceRowNumbers?.[i];
      counts.scanned += 1;

      const passesFilter = evaluateFilterDefinition(row, input.filterDefinition, columns);
      if (!passesFilter) {
        counts.excludedByFilter += 1;
        if (sampleDiagnostics.length < 25) {
          sampleDiagnostics.push({
            sourceRowNumber,
            disposition: "excluded",
            issues: ["filter_mismatch"],
          });
        }
        continue;
      }

      const quality = assessMarketingRowQuality(row, columns, {
        sourceRowNumber,
        seenFingerprints: input.eligibilityRules.excludeDuplicatesInScan ? seen : undefined,
      });

      const issues = [...quality.issues];
      if (
        input.eligibilityRules.requireValidEmailIfPresent &&
        quality.email &&
        !isValidMarketingEmail(quality.email) &&
        !issues.includes("invalid_email")
      ) {
        issues.push("invalid_email");
      }

      if (input.eligibilityRules.requireIdentity && !quality.fingerprint) {
        counts.invalid += 1;
        if (sampleDiagnostics.length < 25) {
          sampleDiagnostics.push({
            sourceRowNumber,
            disposition: "invalid",
            issues: issues.length ? issues : ["missing_identity"],
          });
        }
        continue;
      }

      if (issues.includes("duplicate_in_sample")) {
        counts.duplicate += 1;
        if (sampleDiagnostics.length < 25) {
          sampleDiagnostics.push({
            sourceRowNumber,
            disposition: "duplicate",
            issues,
          });
        }
        continue;
      }

      if (issues.includes("invalid_email") && input.eligibilityRules.requireValidEmailIfPresent) {
        counts.invalid += 1;
        if (sampleDiagnostics.length < 25) {
          sampleDiagnostics.push({
            sourceRowNumber,
            disposition: "invalid",
            issues,
          });
        }
        continue;
      }

      if (input.suppressionPolicy.applyOrgSuppression) {
        let hit = null as ReturnType<typeof marketingSuppressionStore.findMatch>;
        for (const fp of suppressionCandidates(quality)) {
          hit = marketingSuppressionStore.findMatch(
            input.organizationId,
            fp,
            input.suppressionPolicy.reasons,
          );
          if (hit) break;
        }
        if (hit) {
          counts.suppressed += 1;
          if (sampleDiagnostics.length < 25) {
            sampleDiagnostics.push({
              sourceRowNumber,
              disposition: "suppressed",
              issues: [`suppression:${hit.reason}`],
            });
          }
          continue;
        }
      }

      counts.eligible += 1;
      if (sampleDiagnostics.length < 25) {
        sampleDiagnostics.push({
          sourceRowNumber,
          disposition: "eligible",
          issues: [],
        });
      }
    }

    if (!page.nextCursor) break;
    cursor = page.nextCursor;
    if (counts.scanned >= SCAN_MAX) {
      scanCapped = true;
      break;
    }
  }

  if (counts.scanned >= SCAN_MAX) scanCapped = true;

  return {
    audienceId: input.audienceId ?? null,
    bindingId: input.bindingId,
    datasetId: input.datasetId,
    availableFields: schema.headers,
    detectedColumns: {
      emailColumn: columns.emailColumn,
      phoneColumn: columns.phoneColumn,
      externalKeyColumn: columns.externalKeyColumn,
    },
    scannedRows: counts.scanned,
    scanCapped,
    scanMaxRows: SCAN_MAX,
    estimatedSourceRows: estimate?.dataRowEstimate ?? null,
    counts: {
      scanned: counts.scanned,
      eligible: counts.eligible,
      excludedByFilter: counts.excludedByFilter,
      invalid: counts.invalid,
      duplicate: counts.duplicate,
      suppressed: counts.suppressed,
    },
    sampleDiagnostics,
    notice:
      "Audience preview uses streamed source rows for counts only. Personal fields are not returned. Raw database remains external. No Contacts, Opportunities, Leads, or sends.",
  };
}

export const marketingAudienceService = {
  list(actor: { userId?: string; organizationId?: string | null }) {
    assertAudienceStaysNonOperational();
    const organizationId = orgId(actor.organizationId);
    const items = marketingAudienceDefinitionStore.list(organizationId);
    recordMarketingAuditEvent({
      kind: "audience.list",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { count: items.length },
    });
    return items;
  },

  get(actor: { userId?: string; organizationId?: string | null }, audienceId: string) {
    assertAudienceStaysNonOperational();
    const organizationId = orgId(actor.organizationId);
    const item = marketingAudienceDefinitionStore.getForOrg(audienceId, organizationId);
    if (!item) {
      throw Object.assign(new Error("Audience not found"), {
        statusCode: 404,
        code: "NOT_FOUND",
      });
    }
    return item;
  },

  upsert(
    actor: { userId?: string; organizationId?: string | null },
    input: {
      id?: string;
      name: string;
      description?: string | null;
      bindingId: string;
      datasetId: string;
      datasetDisplayName?: string | null;
      filterDefinition?: MarketingFilterDefinition;
      suppressionPolicy?: MarketingSuppressionPolicy;
      eligibilityRules?: MarketingEligibilityRules;
    },
  ): MarketingAudienceDefinition {
    assertAudienceStaysNonOperational();
    const organizationId = orgId(actor.organizationId);
    // Ensure binding is visible to org (throws if sheets off)
    marketingDataSourceService.getPort(organizationId);
    const binding = marketingDataSourceService
      .listBindings(actor)
      .find((b) => b.id === input.bindingId);
    if (!binding) {
      throw Object.assign(new Error("Data source binding not found for organization"), {
        statusCode: 404,
        code: "BINDING_NOT_FOUND",
      });
    }
    const saved = marketingAudienceDefinitionStore.upsert({
      ...input,
      organizationId,
    });
    recordMarketingAuditEvent({
      kind: "audience.upsert",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { audienceId: saved.id, bindingId: saved.bindingId, datasetId: saved.datasetId },
    });
    return saved;
  },

  remove(actor: { userId?: string; organizationId?: string | null }, audienceId: string) {
    assertAudienceStaysNonOperational();
    const organizationId = orgId(actor.organizationId);
    const ok = marketingAudienceDefinitionStore.remove(audienceId, organizationId);
    if (!ok) {
      throw Object.assign(new Error("Audience not found"), {
        statusCode: 404,
        code: "NOT_FOUND",
      });
    }
    recordMarketingAuditEvent({
      kind: "audience.delete",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { audienceId },
    });
    return { deleted: true };
  },

  async previewDraft(
    actor: { userId?: string; organizationId?: string | null },
    input: {
      bindingId: string;
      datasetId: string;
      filterDefinition: MarketingFilterDefinition;
      suppressionPolicy?: MarketingSuppressionPolicy;
      eligibilityRules?: MarketingEligibilityRules;
    },
  ) {
    assertAudienceStaysNonOperational();
    const organizationId = orgId(actor.organizationId);
    const result = await evaluateAudiencePreview({
      organizationId,
      bindingId: input.bindingId,
      datasetId: input.datasetId,
      filterDefinition: input.filterDefinition,
      suppressionPolicy: input.suppressionPolicy ?? {
        applyOrgSuppression: true,
        reasons: [],
      },
      eligibilityRules: input.eligibilityRules ?? {
        requireIdentity: true,
        requireValidEmailIfPresent: true,
        excludeDuplicatesInScan: true,
      },
    });
    recordMarketingAuditEvent({
      kind: "audience.preview",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: {
        bindingId: input.bindingId,
        datasetId: input.datasetId,
        eligible: result.counts.eligible,
        scanned: result.counts.scanned,
      },
    });
    return result;
  },

  async previewSaved(
    actor: { userId?: string; organizationId?: string | null },
    audienceId: string,
  ) {
    const def = this.get(actor, audienceId);
    return this.previewDraft(actor, {
      bindingId: def.bindingId,
      datasetId: def.datasetId,
      filterDefinition: def.filterDefinition,
      suppressionPolicy: def.suppressionPolicy,
      eligibilityRules: def.eligibilityRules,
    }).then((r) => ({ ...r, audienceId: def.id }));
  },

  listSuppressions(actor: { userId?: string; organizationId?: string | null }) {
    assertAudienceStaysNonOperational();
    const organizationId = orgId(actor.organizationId);
    // Return fingerprints + reasons only (fingerprints are already hashed identity keys)
    return marketingSuppressionStore.list(organizationId).map((r) => ({
      id: r.id,
      reason: r.reason,
      channel: r.channel,
      fingerprintKind: r.fingerprint.split(":")[0] ?? "unknown",
      createdAt: r.createdAt,
      note: r.note,
    }));
  },
};
