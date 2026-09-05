/**
 * CO-MARKETING-MKT-02 / REDESIGN-003 — Marketing Data Source application service.
 * READ-only audience source access. No import, send, Contact, or Opportunity.
 * Arbitrary spreadsheet IDs are rejected. Google credentials never leave the server.
 */

import {
  ENTERPRISE_MARKETING_AUDIENCE_IMPORT_ENABLED,
  ENTERPRISE_MARKETING_SHEETS_MODE,
  ENTERPRISE_MARKETING_SHEETS_READ_ENABLED,
  MARKETING_SHEETS_PAGE_MAX_ROWS,
  MARKETING_SHEETS_PREVIEW_MAX_ROWS,
} from "@/constants/enterprise-marketing-engine";
import {
  assessMarketingRowQuality,
  detectMarketingSheetColumns,
  summarizeSampleQuality,
} from "@/lib/enterprise-marketing-engine/data-quality";
import { suggestMarketingColumnMap } from "@/lib/enterprise-marketing-engine/column-mapping";
import {
  assertMarketingSheetsConfigured,
  assertSpreadsheetIsAuthorised,
  resolveMarketingSheetsSourceStatus,
} from "@/lib/enterprise-marketing-engine/authorised-workbook";
import { EnterpriseMarketingSafetyError } from "@/lib/enterprise-marketing-engine/safety";
import type { MarketingDataSourcePort } from "@/lib/enterprise-marketing-engine/ports/data-source.port";
import type { MarketingDataSourceBinding } from "@/types/enterprise-marketing-data-source";
import { recordMarketingAuditEvent } from "./audit";
import { createFixtureMarketingDataSourcePort } from "./adapters/fixture-sheets.adapter";
import { createGoogleSheetsMarketingDataSourcePort } from "./adapters/google-sheets.adapter";
import {
  ensureFixtureBinding,
  marketingDataSourceBindingStore,
} from "./binding-store";

function assertSheetsReadEnabled() {
  if (!ENTERPRISE_MARKETING_SHEETS_READ_ENABLED) {
    throw new EnterpriseMarketingSafetyError("dataSource.sheetsRead");
  }
}

function assertNoAudienceImport() {
  if (ENTERPRISE_MARKETING_AUDIENCE_IMPORT_ENABLED) {
    throw new EnterpriseMarketingSafetyError("audience.import");
  }
}

function resolvePort(organizationId: string): MarketingDataSourcePort {
  assertSheetsReadEnabled();
  assertNoAudienceImport();
  const source = assertMarketingSheetsConfigured();
  if (source.status === "FIXTURE") {
    ensureFixtureBinding(organizationId);
    return createFixtureMarketingDataSourcePort(organizationId);
  }
  if (source.status === "LIVE") {
    return createGoogleSheetsMarketingDataSourcePort(organizationId);
  }
  throw new EnterpriseMarketingSafetyError("dataSource.sheetsModeOff");
}

function orgId(actorOrg?: string | null): string {
  return (actorOrg ?? "").trim() || "default";
}

export const marketingDataSourceService = {
  getMode() {
    const source = resolveMarketingSheetsSourceStatus();
    return {
      sheetsMode: ENTERPRISE_MARKETING_SHEETS_MODE,
      sheetsReadEnabled: source.status === "FIXTURE" || source.status === "LIVE",
      audienceImportEnabled: ENTERPRISE_MARKETING_AUDIENCE_IMPORT_ENABLED,
      previewMaxRows: MARKETING_SHEETS_PREVIEW_MAX_ROWS,
      pageMaxRows: MARKETING_SHEETS_PAGE_MAX_ROWS,
      sourceStatus: source.status,
      sourceLabel: source.label,
      sourceNotice: source.notice,
      authorisedWorkbookId: source.authorisedWorkbookId,
      authorisedWorkbookDisplayName: source.authorisedWorkbookDisplayName,
      googleCredentialsConfigured: source.googleCredentialsConfigured,
      fixtureVisible: source.status === "FIXTURE",
    };
  },

  /** Shared port resolver for Audience Engine (MKT-03) — READ only. */
  getPort(organizationId?: string | null) {
    return resolvePort(orgId(organizationId));
  },

  resolveOrganizationId(organizationId?: string | null) {
    return orgId(organizationId);
  },

  listBindings(actor: { userId?: string; organizationId?: string | null }) {
    const organizationId = orgId(actor.organizationId);
    const source = resolveMarketingSheetsSourceStatus();
    if (source.status === "NOT_CONFIGURED" || source.status === "OFF") {
      recordMarketingAuditEvent({
        kind: "data_source.list",
        actorUserId: actor.userId ?? null,
        organizationId,
        detail: { count: 0, sourceStatus: source.status },
      });
      return [] as MarketingDataSourceBinding[];
    }
    if (source.status === "FIXTURE") {
      ensureFixtureBinding(organizationId);
    }
    let items = marketingDataSourceBindingStore.list(organizationId);
    if (source.authorisedWorkbookId) {
      items = items.filter((b) => b.spreadsheetId === source.authorisedWorkbookId);
    }
    recordMarketingAuditEvent({
      kind: "data_source.list",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { count: items.length, sourceStatus: source.status },
    });
    return items;
  },

  upsertBinding(
    actor: { userId?: string; organizationId?: string | null },
    input: { id?: string; displayName: string; spreadsheetId?: string },
  ): MarketingDataSourceBinding {
    assertSheetsReadEnabled();
    const source = assertMarketingSheetsConfigured();
    const organizationId = orgId(actor.organizationId);
    const spreadsheetId = assertSpreadsheetIsAuthorised(
      input.spreadsheetId?.trim() || source.authorisedWorkbookId || "",
    );
    const binding = marketingDataSourceBindingStore.upsert({
      id: input.id,
      organizationId,
      displayName: input.displayName,
      spreadsheetId,
    });
    recordMarketingAuditEvent({
      kind: "data_source.upsert",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { bindingId: binding.id, authorised: true },
    });
    return binding;
  },

  async health(actor: { userId?: string; organizationId?: string | null }, bindingId: string) {
    const organizationId = orgId(actor.organizationId);
    const source = resolveMarketingSheetsSourceStatus();
    const port = resolvePort(organizationId);
    if (!port.healthCheck) {
      throw new EnterpriseMarketingSafetyError("dataSource.healthCheck");
    }
    const health = await port.healthCheck(bindingId);
    return {
      ...health,
      sourceStatus: source.status,
      sourceLabel: source.label,
      fixtureVisible: source.status === "FIXTURE",
    };
  },

  async discover(actor: { userId?: string; organizationId?: string | null }, bindingId: string) {
    const organizationId = orgId(actor.organizationId);
    const port = resolvePort(organizationId);
    const datasets = await port.discoverDatasets(bindingId);
    recordMarketingAuditEvent({
      kind: "data_source.discover",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { bindingId, tabs: datasets.length },
    });
    return datasets;
  },

  async schema(
    actor: { userId?: string; organizationId?: string | null },
    bindingId: string,
    datasetId: string,
  ) {
    const organizationId = orgId(actor.organizationId);
    const port = resolvePort(organizationId);
    if (!port.getSchema) {
      throw new EnterpriseMarketingSafetyError("dataSource.getSchema");
    }
    const schema = await port.getSchema(bindingId, datasetId);
    const suggestion = suggestMarketingColumnMap(schema.headers);
    return {
      ...schema,
      suggestedColumnMap: suggestion.suggested,
      mappingNotice: suggestion.notice,
    };
  },

  async preview(
    actor: { userId?: string; organizationId?: string | null },
    bindingId: string,
    datasetId: string,
    limit?: number,
  ) {
    const organizationId = orgId(actor.organizationId);
    const port = resolvePort(organizationId);
    if (!port.previewRows) {
      throw new EnterpriseMarketingSafetyError("dataSource.previewRows");
    }
    const capped = Math.min(
      Math.max(1, limit ?? MARKETING_SHEETS_PREVIEW_MAX_ROWS),
      MARKETING_SHEETS_PREVIEW_MAX_ROWS,
    );
    const page = await port.previewRows({ bindingId, datasetId, limit: capped });
    const schema = port.getSchema
      ? await port.getSchema(bindingId, datasetId)
      : {
          headers: page.rows[0] ? Object.keys(page.rows[0]) : [],
          schemaFingerprint: "",
          detectedEmailColumn: null,
          detectedPhoneColumn: null,
          detectedExternalKeyColumn: null,
        };

    const columns = detectMarketingSheetColumns(schema.headers);
    const suggestion = suggestMarketingColumnMap(schema.headers);
    const seen = new Set<string>();
    const quality = page.rows.map((row, i) =>
      assessMarketingRowQuality(row, columns, {
        sourceRowNumber: page.sourceRowNumbers?.[i],
        seenFingerprints: seen,
      }),
    );

    recordMarketingAuditEvent({
      kind: "data_source.preview",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { bindingId, datasetId, rows: page.rows.length },
    });

    return {
      schema: {
        ...schema,
        suggestedColumnMap: suggestion.suggested,
        mappingNotice: suggestion.notice,
      },
      rows: page.rows,
      sourceRowNumbers: page.sourceRowNumbers ?? [],
      quality,
      qualitySummary: summarizeSampleQuality(quality),
      cappedAt: MARKETING_SHEETS_PREVIEW_MAX_ROWS,
      notice:
        "Preview sample only — full audience remains in Google Sheets / fixture. Nothing imported. No Contacts created. Confirm column mapping before freeze.",
    };
  },

  async estimate(
    actor: { userId?: string; organizationId?: string | null },
    bindingId: string,
    datasetId: string,
  ) {
    const organizationId = orgId(actor.organizationId);
    const port = resolvePort(organizationId);
    if (!port.estimateAudience) {
      throw new EnterpriseMarketingSafetyError("dataSource.estimateAudience");
    }
    return port.estimateAudience(bindingId, datasetId);
  },
};
