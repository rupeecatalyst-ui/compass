/**
 * CO-MARKETING-MKT-03 / REDESIGN-003 — Marketing Audience Engine.
 * Definitions + eligibility over external Sheets / fixture.
 * Never mirrors rows · never creates Contacts / Opportunities / Leads · never sends.
 */

import { ENTERPRISE_MARKETING_AUDIENCE_IMPORT_ENABLED } from "@/constants/enterprise-marketing-engine";
import { emptyFilterDefinition } from "@/lib/enterprise-marketing-engine/audience-filters";
import {
  confirmMarketingColumnMap,
  suggestMarketingColumnMap,
} from "@/lib/enterprise-marketing-engine/column-mapping";
import { scanMarketingAudienceEligibility } from "@/lib/enterprise-marketing-engine/eligibility-scan";
import { freezeApprovedAudienceSnapshot } from "@/lib/enterprise-marketing-engine/freeze-audience";
import { getConfiguredMarketingDurabilityPorts } from "@/lib/enterprise-marketing-engine/durability/composition";
import { EnterpriseMarketingSafetyError } from "@/lib/enterprise-marketing-engine/safety";
import type {
  MarketingAudienceDefinition,
  MarketingAudiencePreviewResult,
  MarketingEligibilityRules,
  MarketingFilterDefinition,
  MarketingSuppressionPolicy,
} from "@/types/enterprise-marketing-audience";
import type {
  MarketingColumnMap,
  MarketingConfirmedColumnMapping,
} from "@/types/enterprise-marketing-durability";
import { recordMarketingAuditEvent } from "./audit";
import { marketingAudienceDefinitionStore } from "./audience-definition-store";
import { marketingDataSourceService } from "./data-source.service";
import { marketingSuppressionStore } from "./suppression-store";
import { ensureAudienceDurabilityPorts } from "./workbook-registry";

function assertAudienceStaysNonOperational() {
  if (ENTERPRISE_MARKETING_AUDIENCE_IMPORT_ENABLED) {
    throw new EnterpriseMarketingSafetyError("audience.import");
  }
}

function orgId(actorOrg?: string | null) {
  return marketingDataSourceService.resolveOrganizationId(actorOrg);
}

function suppressionLookups(organizationId: string, applyOrgSuppression: boolean) {
  return {
    isSuppressed: (input: {
      normalizedEmail: string;
      fingerprint: string;
      mobile: string;
      sourceStableKey: string;
      consentValue?: string | null;
    }) => {
      const candidates = [
        input.fingerprint,
        input.normalizedEmail ? `email:${input.normalizedEmail}` : "",
        input.mobile ? `phone:${input.mobile}` : "",
        input.sourceStableKey ? `ext:${input.sourceStableKey}` : "",
      ].filter(Boolean);
      const decision = marketingSuppressionStore.evaluateDelivery({
        organizationId,
        fingerprints: candidates,
        channel: "EMAIL",
        phase: "snapshot_approval",
        consentValue: input.consentValue,
        applyOptionalOrgSuppression: applyOrgSuppression,
      });
      return decision.blocked;
    },
    isPreviouslyContacted: (normalizedEmail: string) =>
      previouslyContactedCache.get(`${organizationId}:${normalizedEmail}`) === true,
  };
}

const previouslyContactedCache = new Map<string, boolean>();

export function seedMarketingPreviouslyContacted(
  organizationId: string,
  emails: string[],
): void {
  for (const email of emails) {
    previouslyContactedCache.set(`${organizationId}:${email.trim().toLowerCase()}`, true);
  }
}

export function resetMarketingPreviouslyContacted(): void {
  previouslyContactedCache.clear();
}

async function evaluateAudiencePreview(input: {
  organizationId: string;
  bindingId: string;
  datasetId: string;
  filterDefinition: MarketingFilterDefinition;
  exclusionDefinition?: MarketingFilterDefinition;
  suppressionPolicy: MarketingSuppressionPolicy;
  eligibilityRules: MarketingEligibilityRules;
  columnMap?: MarketingColumnMap | null;
  mapping?: MarketingConfirmedColumnMapping | null;
  mappingConfirmed?: boolean;
  purpose?: "preview" | "approval";
  audienceId?: string | null;
}): Promise<MarketingAudiencePreviewResult> {
  assertAudienceStaysNonOperational();
  const port = marketingDataSourceService.getPort(input.organizationId);
  if (!port.getSchema) {
    throw new EnterpriseMarketingSafetyError("audience.sourcePortIncomplete");
  }
  const schema = await port.getSchema(input.bindingId, input.datasetId);
  const suggestion = suggestMarketingColumnMap(schema.headers);
  const mappingConfirmed = Boolean(input.mapping?.confirmed || input.mappingConfirmed);
  const columnMap = input.mapping?.map ?? input.columnMap ?? suggestion.suggested;
  const purpose = input.purpose ?? "preview";

  const scan = await scanMarketingAudienceEligibility({
    port,
    bindingId: input.bindingId,
    datasetId: input.datasetId,
    columnMap,
    mapping: mappingConfirmed && input.mapping ? input.mapping : { confirmed: mappingConfirmed },
    inclusion: input.filterDefinition,
    exclusion: input.exclusionDefinition ?? emptyFilterDefinition(),
    eligibilityRules: input.eligibilityRules,
    purpose,
    lookups: suppressionLookups(input.organizationId, input.suppressionPolicy.applyOrgSuppression),
  });

  return {
    audienceId: input.audienceId ?? null,
    bindingId: input.bindingId,
    datasetId: input.datasetId,
    availableFields: scan.availableFields,
    detectedColumns: {
      emailColumn: columnMap.email || null,
      phoneColumn: columnMap.mobile || null,
      externalKeyColumn: columnMap.sourceStableKey || null,
    },
    scannedRows: scan.counts.scannedRows,
    scanCapped: scan.scanCapped,
    scanMaxRows: scan.scanMaxRows ?? 0,
    estimatedSourceRows: scan.counts.totalRows,
    mappingConfirmed,
    usingSuggestedMapping: !mappingConfirmed,
    counts: {
      totalRows: scan.counts.totalRows,
      scanned: scan.counts.scannedRows,
      validEmails: scan.counts.validEmails,
      invalidEmails: scan.counts.invalidEmails,
      eligible: scan.counts.eligible,
      excludedByFilter: scan.counts.excludedByFilter,
      invalid: scan.counts.invalidEmails,
      duplicate: scan.counts.duplicates,
      suppressed: scan.counts.suppressed,
      previouslyContacted: scan.counts.previouslyContacted,
    },
    sampleDiagnostics: scan.sampleDiagnostics,
    sampleRecipients: scan.sampleRecipients,
    notice: scan.notice,
  };
}

async function persistDurableAudienceDefinition(
  actorUserId: string | null | undefined,
  saved: MarketingAudienceDefinition,
) {
  const ports = ensureAudienceDurabilityPorts();
  if (!ports) return;
  await ports.audienceDefinitions.upsert({
    id: saved.id,
    organizationId: saved.organizationId,
    campaignId: saved.campaignId ?? null,
    bindingId: saved.bindingId,
    sourceTabId: saved.datasetId,
    sourceTabName: saved.datasetDisplayName ?? saved.datasetId,
    columnMap: saved.columnMap ?? { email: "" },
    name: saved.name,
    description: saved.description ?? null,
    filterDefinition: saved.filterDefinition,
    exclusionDefinition: saved.exclusionDefinition,
    suppressionPolicy: saved.suppressionPolicy,
    eligibilityRules: saved.eligibilityRules,
    mappingConfirmed: saved.mappingConfirmed,
    createdByUserId: actorUserId ?? null,
    updatedByUserId: actorUserId ?? null,
    createdAt: saved.createdAt,
    updatedAt: saved.updatedAt,
  });
}

async function hydrateDurableAudienceDefinitions(organizationId: string) {
  const ports = getConfiguredMarketingDurabilityPorts() ?? ensureAudienceDurabilityPorts();
  if (!ports) return;
  const rows = await ports.audienceDefinitions.list(organizationId);
  for (const row of rows) {
    marketingAudienceDefinitionStore.upsert({
      id: row.id,
      organizationId: row.organizationId,
      name: row.name || "Audience",
      description: row.description ?? null,
      bindingId: row.bindingId,
      datasetId: row.sourceTabId,
      datasetDisplayName: row.sourceTabName,
      campaignId: row.campaignId,
      columnMap: row.columnMap,
      mappingConfirmed: Boolean(row.mappingConfirmed),
      filterDefinition: row.filterDefinition as MarketingFilterDefinition | undefined,
      exclusionDefinition: row.exclusionDefinition as MarketingFilterDefinition | undefined,
      suppressionPolicy: row.suppressionPolicy as MarketingSuppressionPolicy | undefined,
      eligibilityRules: row.eligibilityRules as MarketingEligibilityRules | undefined,
    });
  }
}

export const marketingAudienceService = {
  async list(actor: { userId?: string; organizationId?: string | null }) {
    assertAudienceStaysNonOperational();
    const organizationId = orgId(actor.organizationId);
    await hydrateDurableAudienceDefinitions(organizationId);
    const items = marketingAudienceDefinitionStore.list(organizationId);
    recordMarketingAuditEvent({
      kind: "audience.list",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { count: items.length },
    });
    return items;
  },

  async get(actor: { userId?: string; organizationId?: string | null }, audienceId: string) {
    assertAudienceStaysNonOperational();
    const organizationId = orgId(actor.organizationId);
    await hydrateDurableAudienceDefinitions(organizationId);
    const item = marketingAudienceDefinitionStore.getForOrg(audienceId, organizationId);
    if (!item) {
      throw Object.assign(new Error("Audience not found"), {
        statusCode: 404,
        code: "NOT_FOUND",
      });
    }
    return item;
  },

  async upsert(
    actor: { userId?: string; organizationId?: string | null },
    input: {
      id?: string;
      name: string;
      description?: string | null;
      bindingId: string;
      datasetId: string;
      datasetDisplayName?: string | null;
      campaignId?: string | null;
      filterDefinition?: MarketingFilterDefinition;
      exclusionDefinition?: MarketingFilterDefinition;
      suppressionPolicy?: MarketingSuppressionPolicy;
      eligibilityRules?: MarketingEligibilityRules;
      columnMap?: MarketingColumnMap | null;
      mapping?: MarketingConfirmedColumnMapping | null;
      mappingConfirmed?: boolean;
      confirmMapping?: boolean;
      headers?: string[];
    },
  ): Promise<MarketingAudienceDefinition> {
    assertAudienceStaysNonOperational();
    const organizationId = orgId(actor.organizationId);
    marketingDataSourceService.getPort(organizationId);
    const bindings = await marketingDataSourceService.listBindings(actor);
    const binding = bindings.find((b) => b.id === input.bindingId);
    if (!binding) {
      throw Object.assign(new Error("Data source binding not found for organization"), {
        statusCode: 404,
        code: "BINDING_NOT_FOUND",
      });
    }

    let mapping = input.mapping ?? null;
    if (input.confirmMapping && input.columnMap && input.headers) {
      mapping = confirmMarketingColumnMap({
        map: input.columnMap,
        headers: input.headers,
        confirmedByUserId: actor.userId ?? null,
        channel: "EMAIL",
      });
    }

    const saved = marketingAudienceDefinitionStore.upsert({
      ...input,
      organizationId,
      mapping,
      columnMap: mapping?.map ?? input.columnMap ?? null,
      mappingConfirmed: Boolean(mapping?.confirmed || input.mappingConfirmed),
    });
    await persistDurableAudienceDefinition(actor.userId ?? null, saved);
    recordMarketingAuditEvent({
      kind: "audience.upsert",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: {
        audienceId: saved.id,
        bindingId: saved.bindingId,
        datasetId: saved.datasetId,
        mappingConfirmed: saved.mappingConfirmed,
      },
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
      exclusionDefinition?: MarketingFilterDefinition;
      suppressionPolicy?: MarketingSuppressionPolicy;
      eligibilityRules?: MarketingEligibilityRules;
      columnMap?: MarketingColumnMap | null;
      mapping?: MarketingConfirmedColumnMapping | null;
      mappingConfirmed?: boolean;
      fullScan?: boolean;
    },
  ) {
    assertAudienceStaysNonOperational();
    const organizationId = orgId(actor.organizationId);
    const result = await evaluateAudiencePreview({
      organizationId,
      bindingId: input.bindingId,
      datasetId: input.datasetId,
      filterDefinition: input.filterDefinition,
      exclusionDefinition: input.exclusionDefinition,
      suppressionPolicy: input.suppressionPolicy ?? {
        applyOrgSuppression: true,
        reasons: [],
      },
      eligibilityRules: input.eligibilityRules ?? {
        requireIdentity: true,
        requireValidEmailIfPresent: true,
        excludeDuplicatesInScan: true,
      },
      columnMap: input.columnMap,
      mapping: input.mapping,
      mappingConfirmed: input.mappingConfirmed,
      purpose: input.fullScan ? "approval" : "preview",
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
        fullScan: Boolean(input.fullScan),
      },
    });
    return result;
  },

  async previewSaved(
    actor: { userId?: string; organizationId?: string | null },
    audienceId: string,
    opts?: { fullScan?: boolean },
  ) {
    const def = await this.get(actor, audienceId);
    return this.previewDraft(actor, {
      bindingId: def.bindingId,
      datasetId: def.datasetId,
      filterDefinition: def.filterDefinition,
      exclusionDefinition: def.exclusionDefinition,
      suppressionPolicy: def.suppressionPolicy,
      eligibilityRules: def.eligibilityRules,
      columnMap: def.columnMap,
      mapping: def.mapping,
      mappingConfirmed: def.mappingConfirmed,
      fullScan: opts?.fullScan,
    }).then((r) => ({ ...r, audienceId: def.id }));
  },

  async freezeForCampaign(
    actor: { userId?: string; organizationId?: string | null },
    input: {
      audienceId: string;
      campaignId: string;
      campaignVersionId: string;
      channel?: "EMAIL" | "WHATSAPP" | "DIGITAL";
    },
  ) {
    assertAudienceStaysNonOperational();
    const ports = ensureAudienceDurabilityPorts();
    if (!ports) {
      throw Object.assign(new Error("Durable snapshot ports are not configured"), {
        statusCode: 503,
        code: "DURABLE_PERSISTENCE_UNAVAILABLE",
      });
    }
    const organizationId = orgId(actor.organizationId);
    const def = await this.get(actor, input.audienceId);
    if (!def.mapping || !def.mappingConfirmed) {
      throw Object.assign(
        new Error("Confirm the column mapping before freezing an audience snapshot"),
        { statusCode: 400, code: "MAPPING_NOT_CONFIRMED" },
      );
    }
    const port = marketingDataSourceService.getPort(organizationId);
    const schema = port.getSchema
      ? await port.getSchema(def.bindingId, def.datasetId)
      : { headers: [] };
    const datasets = await marketingDataSourceService.discover(actor, def.bindingId);
    const tab = datasets.find((d) => d.externalDatasetId === def.datasetId);
    const bindings = await marketingDataSourceService.listBindings(actor);
    const binding = bindings.find((b) => b.id === def.bindingId);
    if (!binding) {
      throw Object.assign(new Error("Authorised workbook binding not found"), {
        statusCode: 404,
        code: "BINDING_NOT_FOUND",
      });
    }

    const frozen = await freezeApprovedAudienceSnapshot({
      ports,
      port,
      organizationId,
      campaignId: input.campaignId,
      campaignVersionId: input.campaignVersionId,
      sourceBindingId: def.bindingId,
      sourceWorkbookId: binding.spreadsheetId,
      sourceTabId: def.datasetId,
      sourceTabName: tab?.displayName ?? def.datasetDisplayName ?? def.datasetId,
      mapping: def.mapping,
      headers: schema.headers,
      inclusion: def.filterDefinition,
      exclusion: def.exclusionDefinition,
      eligibilityRules: def.eligibilityRules,
      lookups: suppressionLookups(organizationId, def.suppressionPolicy.applyOrgSuppression),
      channel: input.channel ?? "EMAIL",
      actorUserId: actor.userId ?? null,
    });

    recordMarketingAuditEvent({
      kind: "audience.freeze",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: {
        campaignId: input.campaignId,
        snapshotId: frozen.snapshot.id,
        snapshotHash: frozen.snapshotHash,
        eligibleCount: frozen.eligibleCount,
      },
    });
    const stamped = marketingAudienceDefinitionStore.upsert({
      ...def,
      lastSnapshotId: frozen.snapshot.id,
      lastSnapshotHash: frozen.snapshotHash,
    });
    await persistDurableAudienceDefinition(actor.userId ?? null, stamped);
    return frozen;
  },

  listSuppressions(actor: { userId?: string; organizationId?: string | null }) {
    assertAudienceStaysNonOperational();
    const organizationId = orgId(actor.organizationId);
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
