/**
 * CO-MARKETING-MKT-02 — Marketing Data Source application service.
 * READ-only audience source access. No import, send, Contact, or Opportunity.
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
    // Belt-and-suspenders — must never be true in MKT-02
    throw new EnterpriseMarketingSafetyError("audience.import");
  }
}

function resolvePort(organizationId: string): MarketingDataSourcePort {
  assertSheetsReadEnabled();
  assertNoAudienceImport();
  if (ENTERPRISE_MARKETING_SHEETS_MODE === "fixture") {
    ensureFixtureBinding(organizationId);
    return createFixtureMarketingDataSourcePort(organizationId);
  }
  if (ENTERPRISE_MARKETING_SHEETS_MODE === "live") {
    return createGoogleSheetsMarketingDataSourcePort(organizationId);
  }
  throw new EnterpriseMarketingSafetyError("dataSource.sheetsModeOff");
}

function orgId(actorOrg?: string | null): string {
  return (actorOrg ?? "").trim() || "default";
}

export const marketingDataSourceService = {
  getMode() {
    return {
      sheetsMode: ENTERPRISE_MARKETING_SHEETS_MODE,
      sheetsReadEnabled: ENTERPRISE_MARKETING_SHEETS_READ_ENABLED,
      audienceImportEnabled: ENTERPRISE_MARKETING_AUDIENCE_IMPORT_ENABLED,
      previewMaxRows: MARKETING_SHEETS_PREVIEW_MAX_ROWS,
      pageMaxRows: MARKETING_SHEETS_PAGE_MAX_ROWS,
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
    if (ENTERPRISE_MARKETING_SHEETS_MODE === "fixture") {
      ensureFixtureBinding(organizationId);
    }
    let items = marketingDataSourceBindingStore.list(organizationId);
    if (ENTERPRISE_MARKETING_SHEETS_MODE === "fixture") {
      items = items.filter((b) => b.spreadsheetId === "fixture-marketing-master");
    }
    recordMarketingAuditEvent({
      kind: "data_source.list",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { count: items.length },
    });
    return items;
  },

  upsertBinding(
    actor: { userId?: string; organizationId?: string | null },
    input: { id?: string; displayName: string; spreadsheetId: string },
  ): MarketingDataSourceBinding {
    assertSheetsReadEnabled();
    const organizationId = orgId(actor.organizationId);
    if (ENTERPRISE_MARKETING_SHEETS_MODE === "fixture") {
      // In fixture mode, only allow the controlled fixture spreadsheet id
      if (input.spreadsheetId.trim() !== "fixture-marketing-master") {
        throw Object.assign(
          new Error(
            "Fixture mode only accepts spreadsheetId=fixture-marketing-master (controlled non-production dataset).",
          ),
          { statusCode: 400, code: "FIXTURE_ONLY" },
        );
      }
    }
    const binding = marketingDataSourceBindingStore.upsert({
      id: input.id,
      organizationId,
      displayName: input.displayName,
      spreadsheetId: input.spreadsheetId,
    });
    recordMarketingAuditEvent({
      kind: "data_source.upsert",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { bindingId: binding.id },
    });
    return binding;
  },

  async health(actor: { userId?: string; organizationId?: string | null }, bindingId: string) {
    const organizationId = orgId(actor.organizationId);
    const port = resolvePort(organizationId);
    if (!port.healthCheck) {
      throw new EnterpriseMarketingSafetyError("dataSource.healthCheck");
    }
    return port.healthCheck(bindingId);
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
    return port.getSchema(bindingId, datasetId);
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
      schema,
      rows: page.rows,
      sourceRowNumbers: page.sourceRowNumbers ?? [],
      quality,
      qualitySummary: summarizeSampleQuality(quality),
      cappedAt: MARKETING_SHEETS_PREVIEW_MAX_ROWS,
      notice:
        "Preview sample only — full audience remains in Google Sheets / fixture. Nothing imported to Supabase. No Contacts created.",
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
