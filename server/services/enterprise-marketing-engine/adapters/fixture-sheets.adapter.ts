/**
 * CO-MARKETING-MKT-02 — Controlled non-production Sheets fixture.
 * Multiple dynamically named tabs — not hard-coded production categories as engine logic.
 */

import {
  detectMarketingSheetColumns,
  fingerprintSchemaHeaders,
} from "@/lib/enterprise-marketing-engine/data-quality";
import type {
  MarketingAudienceEstimate,
  MarketingDataSourcePort,
  MarketingDatasetDescriptor,
  MarketingDatasetSchema,
  MarketingRowPage,
} from "@/lib/enterprise-marketing-engine/ports/data-source.port";
import {
  ensureFixtureBinding,
  marketingDataSourceBindingStore,
} from "../binding-store";

type FixtureTab = {
  id: string;
  title: string;
  headers: string[];
  rows: Record<string, string>[];
};

const FIXTURE_TABS: FixtureTab[] = [
  {
    id: "tab_alpha",
    title: "Segment Alpha",
    headers: ["External Key", "Full Name", "Email", "Phone", "City", "Profession"],
    rows: [
      {
        "External Key": "FX-001",
        "Full Name": "Asha Verma",
        Email: "asha.verma@example.com",
        Phone: "9876543210",
        City: "Pune",
        Profession: "CA",
      },
      {
        "External Key": "FX-002",
        "Full Name": "Rohit Nair",
        Email: "not-an-email",
        Phone: "9123456780",
        City: "Mumbai",
        Profession: "Doctor",
      },
      {
        "External Key": "FX-003",
        "Full Name": "Duplicate Probe",
        Email: "asha.verma@example.com",
        Phone: "9000000001",
        City: "Pune",
        Profession: "CA",
      },
      {
        "External Key": "",
        "Full Name": "Missing Identity",
        Email: "",
        Phone: "",
        City: "Delhi",
        Profession: "Other",
      },
      {
        "External Key": "FX-005",
        "Full Name": "Neha Shah",
        Email: "neha.shah@example.com",
        Phone: "9988776655",
        City: "Ahmedabad",
        Profession: "Professional",
      },
    ],
  },
  {
    id: "tab_beta",
    title: "Segment Beta",
    headers: ["Name", "Email Address", "Mobile Number"],
    rows: Array.from({ length: 12 }, (_, i) => ({
      Name: `Fixture Person ${i + 1}`,
      "Email Address": `fixture.person${i + 1}@example.com`,
      "Mobile Number": `98${String(10000000 + i).slice(0, 8)}`,
    })),
  },
  {
    id: "tab_gamma",
    title: "Segment Gamma",
    headers: ["Prospect Id", "Email", "Notes"],
    rows: [
      { "Prospect Id": "P-100", Email: "gamma.one@example.com", Notes: "ok" },
      { "Prospect Id": "P-101", Email: "gamma.two@example.com", Notes: "ok" },
    ],
  },
];

function requireFixtureBinding(bindingId: string, organizationId: string) {
  ensureFixtureBinding(organizationId);
  const b = marketingDataSourceBindingStore.getForOrg(bindingId, organizationId);
  if (!b) {
    throw Object.assign(new Error("Data source binding not found"), {
      statusCode: 404,
      code: "NOT_FOUND",
    });
  }
  if (b.spreadsheetId !== "fixture-marketing-master") {
    throw Object.assign(new Error("Fixture adapter cannot read live spreadsheet ids"), {
      statusCode: 400,
      code: "INVALID_MODE",
    });
  }
  return b;
}

/** Synthetic external-source simulation — rows are generated, never stored. */
const SYNTHETIC_SCALE_TABS: Record<
  string,
  { title: string; count: number }
> = {
  tab_scale_1k: { title: "Synthetic 1,000 (external simulation)", count: 1_000 },
  tab_scale_10k: { title: "Synthetic 10,000 (external simulation)", count: 10_000 },
  tab_scale_100k: { title: "Synthetic 100,000 (external simulation)", count: 100_000 },
};

const SCALE_HEADERS = ["External Key", "Full Name", "Email", "Phone", "City", "Profession"];

function syntheticScaleRow(index: number): Record<string, string> {
  return {
    "External Key": `SYN-${index}`,
    "Full Name": `Synthetic ${index}`,
    Email: `synthetic.${index}@example.com`,
    Phone: String(9000000000 + (index % 1_000_000_000)),
    City: index % 2 === 0 ? "Pune" : "Mumbai",
    Profession: "Professional",
  };
}

function pageSyntheticScale(count: number, cursor: string | undefined, limit: number): MarketingRowPage {
  const start = cursor ? Math.max(0, Number.parseInt(cursor, 10) || 0) : 0;
  const end = Math.min(start + Math.max(1, limit), count);
  const rows: Record<string, string>[] = [];
  for (let i = start; i < end; i += 1) rows.push(syntheticScaleRow(i));
  return {
    rows,
    sourceRowNumbers: rows.map((_, i) => start + i + 2),
    nextCursor: end < count ? String(end) : undefined,
  };
}

function getTab(datasetId: string): FixtureTab {
  const tab = FIXTURE_TABS.find((t) => t.id === datasetId);
  if (!tab) {
    throw Object.assign(new Error(`Unknown fixture tab: ${datasetId}`), {
      statusCode: 404,
      code: "DATASET_NOT_FOUND",
    });
  }
  return tab;
}

function pageRows(tab: FixtureTab, cursor: string | undefined, limit: number): MarketingRowPage {
  const start = cursor ? Math.max(0, Number.parseInt(cursor, 10) || 0) : 0;
  const slice = tab.rows.slice(start, start + limit);
  const next = start + slice.length;
  return {
    rows: slice,
    sourceRowNumbers: slice.map((_, i) => start + i + 2),
    nextCursor: next < tab.rows.length ? String(next) : undefined,
  };
}

export function createFixtureMarketingDataSourcePort(
  organizationId: string,
): MarketingDataSourcePort {
  return {
    providerType: "GOOGLE_SHEETS",

    async listBindings() {
      const fixture = ensureFixtureBinding(organizationId);
      return marketingDataSourceBindingStore
        .list(organizationId)
        .filter((b) => b.id === fixture.id || b.spreadsheetId === "fixture-marketing-master")
        .map((b) => ({ id: b.id, displayName: b.displayName }));
    },

    async discoverDatasets(bindingId) {
      requireFixtureBinding(bindingId, organizationId);
      marketingDataSourceBindingStore.patch(bindingId, organizationId, {
        lastDiscoverAt: new Date().toISOString(),
      });
      return FIXTURE_TABS.map(
        (t): MarketingDatasetDescriptor => ({
          externalDatasetId: t.id,
          displayName: t.title,
          rowCountEstimate: t.rows.length,
          schemaFingerprint: fingerprintSchemaHeaders(t.headers),
        }),
      );
    },

    async getSchema(bindingId, datasetId): Promise<MarketingDatasetSchema> {
      requireFixtureBinding(bindingId, organizationId);
      const scale = SYNTHETIC_SCALE_TABS[datasetId];
      const headers = scale ? SCALE_HEADERS : getTab(datasetId).headers;
      const detected = detectMarketingSheetColumns(headers);
      return {
        headers: [...headers],
        schemaFingerprint: fingerprintSchemaHeaders(headers),
        detectedEmailColumn: detected.emailColumn,
        detectedPhoneColumn: detected.phoneColumn,
        detectedExternalKeyColumn: detected.externalKeyColumn,
      };
    },

    async previewRows({ bindingId, datasetId, limit }): Promise<MarketingRowPage> {
      requireFixtureBinding(bindingId, organizationId);
      const scale = SYNTHETIC_SCALE_TABS[datasetId];
      if (scale) return pageSyntheticScale(scale.count, undefined, Math.max(1, limit));
      const tab = getTab(datasetId);
      return pageRows(tab, undefined, Math.max(1, limit));
    },

    async estimateAudience(bindingId, datasetId): Promise<MarketingAudienceEstimate> {
      requireFixtureBinding(bindingId, organizationId);
      const scale = SYNTHETIC_SCALE_TABS[datasetId];
      if (scale) {
        return {
          approximateRowCount: scale.count,
          dataRowEstimate: scale.count,
          method: "fixture",
          note: "Synthetic external-source simulation — rows are generated, not imported.",
        };
      }
      const tab = getTab(datasetId);
      return {
        approximateRowCount: tab.rows.length + 1,
        dataRowEstimate: tab.rows.length,
        method: "fixture",
        note: "Controlled fixture dataset — not production marketing database.",
      };
    },

    async streamRows({ bindingId, datasetId, cursor, limit }): Promise<MarketingRowPage> {
      requireFixtureBinding(bindingId, organizationId);
      const scale = SYNTHETIC_SCALE_TABS[datasetId];
      if (scale) return pageSyntheticScale(scale.count, cursor, Math.max(1, limit));
      const tab = getTab(datasetId);
      return pageRows(tab, cursor, Math.max(1, limit));
    },

    async healthCheck(bindingId) {
      requireFixtureBinding(bindingId, organizationId);
      const message = "Fixture Sheets adapter healthy (non-production).";
      marketingDataSourceBindingStore.patch(bindingId, organizationId, {
        lastHealthAt: new Date().toISOString(),
        lastHealthOk: true,
        lastHealthMessage: message,
      });
      return { ok: true, message, mode: "fixture" };
    },
  };
}

/** Exported for verify scripts — tab titles are dynamic fixture labels, not production categories. */
export const FIXTURE_MARKETING_TAB_TITLES = FIXTURE_TABS.map((t) => t.title);
export const FIXTURE_SYNTHETIC_SCALE_DATASET_IDS = Object.keys(SYNTHETIC_SCALE_TABS);
