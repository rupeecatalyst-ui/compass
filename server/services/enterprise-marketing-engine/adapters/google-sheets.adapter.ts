/**
 * CO-MARKETING-MKT-02 — Google Sheets live adapter (server-only).
 * Credentials from process.env — never returned to the browser.
 * Reads only; does not mirror rows into Supabase.
 */

import { google } from "googleapis";
import {
  MARKETING_SHEETS_PAGE_MAX_ROWS,
  MARKETING_SHEETS_PREVIEW_MAX_ROWS,
} from "@/constants/enterprise-marketing-engine";
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
import { marketingDataSourceBindingStore } from "../binding-store";

function loadServiceAccount() {
  const clientEmail = (process.env.GOOGLE_SHEETS_CLIENT_EMAIL ?? "").trim();
  let privateKey = (process.env.GOOGLE_SHEETS_PRIVATE_KEY ?? "").trim();
  if (!clientEmail || !privateKey) {
    throw Object.assign(
      new Error(
        "Google Sheets live mode requires GOOGLE_SHEETS_CLIENT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY in server env (.env.local).",
      ),
      { statusCode: 503, code: "SHEETS_CREDENTIALS_MISSING" },
    );
  }
  // Support \n-escaped PEM in env files
  privateKey = privateKey.replace(/\\n/g, "\n");
  return { clientEmail, privateKey };
}

async function getSheetsClient() {
  const { clientEmail, privateKey } = loadServiceAccount();
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  await auth.authorize();
  return google.sheets({ version: "v4", auth });
}

function requireBinding(bindingId: string, organizationId: string) {
  const b = marketingDataSourceBindingStore.getForOrg(bindingId, organizationId);
  if (!b) {
    throw Object.assign(new Error("Data source binding not found"), {
      statusCode: 404,
      code: "NOT_FOUND",
    });
  }
  return b;
}

function a1SheetName(title: string): string {
  // Escape single quotes for A1 notation
  return `'${title.replace(/'/g, "''")}'`;
}

function valuesToObjects(
  headers: string[],
  valueRows: string[][],
  startDataRowNumber: number,
): { rows: Record<string, unknown>[]; sourceRowNumbers: number[] } {
  const rows: Record<string, unknown>[] = [];
  const sourceRowNumbers: number[] = [];
  for (let i = 0; i < valueRows.length; i += 1) {
    const raw = valueRows[i] ?? [];
    const obj: Record<string, unknown> = {};
    let empty = true;
    for (let c = 0; c < headers.length; c += 1) {
      const key = headers[c] ?? `Column_${c + 1}`;
      const val = raw[c] ?? "";
      if (String(val).trim()) empty = false;
      obj[key] = val;
    }
    if (empty) continue;
    rows.push(obj);
    sourceRowNumbers.push(startDataRowNumber + i);
  }
  return { rows, sourceRowNumbers };
}

async function readHeaderAndPage(args: {
  spreadsheetId: string;
  sheetTitle: string;
  cursor?: string;
  limit: number;
}): Promise<{ headers: string[]; page: MarketingRowPage }> {
  const sheets = await getSheetsClient();
  const startOffset = args.cursor ? Math.max(0, Number.parseInt(args.cursor, 10) || 0) : 0;
  const limit = Math.min(Math.max(1, args.limit), MARKETING_SHEETS_PAGE_MAX_ROWS);
  // Row 1 = headers; data starts at row 2
  const dataStart = 2 + startOffset;
  const dataEnd = dataStart + limit - 1;
  const range = `${a1SheetName(args.sheetTitle)}!A1:ZZ${dataEnd}`;

  let response;
  try {
    response = await sheets.spreadsheets.values.get({
      spreadsheetId: args.spreadsheetId,
      range,
      majorDimension: "ROWS",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google Sheets read failed";
    throw Object.assign(new Error(message), {
      statusCode: 502,
      code: "SHEETS_API_ERROR",
    });
  }

  const values = (response.data.values ?? []) as string[][];
  if (values.length === 0) {
    return { headers: [], page: { rows: [], sourceRowNumbers: [] } };
  }
  const headers = (values[0] ?? []).map((h, i) => String(h || `Column_${i + 1}`));
  const dataRows = values.slice(1);
  // values include header at index 0 when start is A1; when cursor>0 we still request A1 for headers
  // Re-read strategy: always fetch header row separately when cursor > 0 for correctness
  if (startOffset > 0) {
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: args.spreadsheetId,
      range: `${a1SheetName(args.sheetTitle)}!A1:ZZ1`,
      majorDimension: "ROWS",
    });
    const hdr = ((headerRes.data.values ?? [])[0] ?? []).map((h, i) =>
      String(h || `Column_${i + 1}`),
    );
    const pageRange = `${a1SheetName(args.sheetTitle)}!A${dataStart}:ZZ${dataEnd}`;
    const pageRes = await sheets.spreadsheets.values.get({
      spreadsheetId: args.spreadsheetId,
      range: pageRange,
      majorDimension: "ROWS",
    });
    const pageValues = (pageRes.data.values ?? []) as string[][];
    const { rows, sourceRowNumbers } = valuesToObjects(hdr, pageValues, dataStart);
    const nextCursor =
      pageValues.length >= limit ? String(startOffset + pageValues.length) : undefined;
    return {
      headers: hdr,
      page: { rows, sourceRowNumbers, nextCursor },
    };
  }

  const { rows, sourceRowNumbers } = valuesToObjects(headers, dataRows, 2);
  const nextCursor =
    dataRows.length >= limit ? String(startOffset + dataRows.length) : undefined;
  return {
    headers,
    page: { rows, sourceRowNumbers, nextCursor },
  };
}

async function resolveSheetTitle(
  spreadsheetId: string,
  datasetId: string,
): Promise<{ title: string; gid?: number; rowCount?: number }> {
  const sheets = await getSheetsClient();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title,gridProperties(rowCount)))",
  });
  const list = meta.data.sheets ?? [];
  for (const s of list) {
    const props = s.properties;
    if (!props) continue;
    const id = String(props.sheetId ?? "");
    if (id === datasetId || props.title === datasetId) {
      return {
        title: props.title ?? datasetId,
        gid: props.sheetId ?? undefined,
        rowCount: props.gridProperties?.rowCount ?? undefined,
      };
    }
  }
  throw Object.assign(new Error(`Sheet/tab not found: ${datasetId}`), {
    statusCode: 404,
    code: "DATASET_NOT_FOUND",
  });
}

export function createGoogleSheetsMarketingDataSourcePort(
  organizationId: string,
): MarketingDataSourcePort {
  return {
    providerType: "GOOGLE_SHEETS",

    async listBindings() {
      return marketingDataSourceBindingStore
        .list(organizationId)
        .map((b) => ({ id: b.id, displayName: b.displayName }));
    },

    async discoverDatasets(bindingId) {
      const binding = requireBinding(bindingId, organizationId);
      try {
        const sheets = await getSheetsClient();
        const meta = await sheets.spreadsheets.get({
          spreadsheetId: binding.spreadsheetId,
          fields: "sheets(properties(sheetId,title,gridProperties(rowCount)))",
        });
        const datasets: MarketingDatasetDescriptor[] = (meta.data.sheets ?? []).map((s) => {
          const props = s.properties;
          const title = props?.title ?? "Untitled";
          const sheetId = String(props?.sheetId ?? title);
          const rowCount = props?.gridProperties?.rowCount ?? undefined;
          return {
            externalDatasetId: sheetId,
            displayName: title,
            sheetGid: props?.sheetId ?? undefined,
            rowCountEstimate: rowCount != null ? Math.max(0, rowCount - 1) : undefined,
          };
        });
        marketingDataSourceBindingStore.patch(bindingId, organizationId, {
          lastDiscoverAt: new Date().toISOString(),
          lastError: null,
          status: "ACTIVE",
        });
        return datasets;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Discover failed";
        marketingDataSourceBindingStore.patch(bindingId, organizationId, {
          status: "ERROR",
          lastError: message,
        });
        throw err;
      }
    },

    async getSchema(bindingId, datasetId): Promise<MarketingDatasetSchema> {
      const binding = requireBinding(bindingId, organizationId);
      const sheet = await resolveSheetTitle(binding.spreadsheetId, datasetId);
      const { headers } = await readHeaderAndPage({
        spreadsheetId: binding.spreadsheetId,
        sheetTitle: sheet.title,
        limit: 1,
      });
      const detected = detectMarketingSheetColumns(headers);
      return {
        headers,
        schemaFingerprint: fingerprintSchemaHeaders(headers),
        detectedEmailColumn: detected.emailColumn,
        detectedPhoneColumn: detected.phoneColumn,
        detectedExternalKeyColumn: detected.externalKeyColumn,
      };
    },

    async previewRows({ bindingId, datasetId, limit }): Promise<MarketingRowPage> {
      const binding = requireBinding(bindingId, organizationId);
      const sheet = await resolveSheetTitle(binding.spreadsheetId, datasetId);
      const capped = Math.min(Math.max(1, limit), MARKETING_SHEETS_PREVIEW_MAX_ROWS);
      const { page } = await readHeaderAndPage({
        spreadsheetId: binding.spreadsheetId,
        sheetTitle: sheet.title,
        limit: capped,
      });
      return page;
    },

    async estimateAudience(bindingId, datasetId): Promise<MarketingAudienceEstimate> {
      const binding = requireBinding(bindingId, organizationId);
      const sheet = await resolveSheetTitle(binding.spreadsheetId, datasetId);
      const grid = sheet.rowCount ?? null;
      return {
        approximateRowCount: grid,
        dataRowEstimate: grid != null ? Math.max(0, grid - 1) : null,
        method: "grid_properties",
        note:
          "Approximate from Google Sheets gridProperties.rowCount (includes unused blank rows). Not a full import count.",
      };
    },

    async streamRows({ bindingId, datasetId, cursor, limit }): Promise<MarketingRowPage> {
      const binding = requireBinding(bindingId, organizationId);
      const sheet = await resolveSheetTitle(binding.spreadsheetId, datasetId);
      const capped = Math.min(Math.max(1, limit), MARKETING_SHEETS_PAGE_MAX_ROWS);
      const { page } = await readHeaderAndPage({
        spreadsheetId: binding.spreadsheetId,
        sheetTitle: sheet.title,
        cursor,
        limit: capped,
      });
      return page;
    },

    async healthCheck(bindingId) {
      const binding = requireBinding(bindingId, organizationId);
      try {
        loadServiceAccount();
        const sheets = await getSheetsClient();
        await sheets.spreadsheets.get({
          spreadsheetId: binding.spreadsheetId,
          fields: "spreadsheetId,properties.title",
        });
        const message = "Google Sheets reachable with service account (readonly).";
        marketingDataSourceBindingStore.patch(bindingId, organizationId, {
          lastHealthAt: new Date().toISOString(),
          lastHealthOk: true,
          lastHealthMessage: message,
          lastError: null,
          status: "ACTIVE",
        });
        return { ok: true, message, mode: "live" };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Health check failed";
        marketingDataSourceBindingStore.patch(bindingId, organizationId, {
          lastHealthAt: new Date().toISOString(),
          lastHealthOk: false,
          lastHealthMessage: message,
          lastError: message,
          status: "ERROR",
        });
        return { ok: false, message, mode: "live" };
      }
    },
  };
}
