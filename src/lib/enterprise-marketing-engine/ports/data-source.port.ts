/**
 * CO-MARKETING-MKT-02 — Marketing Data Source Port (provider-neutral).
 * Google Sheets is the first adapter — engine must not assume it is the only source.
 */

export type MarketingDataSourceProviderType =
  | "GOOGLE_SHEETS"
  | "CSV"
  | "EXCEL"
  | "EXTERNAL_API"
  | "EXTERNAL_DB";

export type MarketingDatasetDescriptor = {
  externalDatasetId: string;
  displayName: string;
  /** Sheet index / gid metadata when available */
  sheetGid?: number;
  rowCountEstimate?: number;
  schemaFingerprint?: string;
};

export type MarketingDatasetSchema = {
  headers: string[];
  schemaFingerprint: string;
  detectedEmailColumn?: string | null;
  detectedPhoneColumn?: string | null;
  detectedExternalKeyColumn?: string | null;
};

export type MarketingAudienceEstimate = {
  /** Approximate only — may include blank grid rows from Sheets. */
  approximateRowCount: number | null;
  dataRowEstimate: number | null;
  method: "grid_properties" | "sample_scan" | "fixture" | "unavailable";
  note: string;
};

export type MarketingRowPage = {
  rows: Record<string, unknown>[];
  nextCursor?: string;
  /** 1-based sheet row numbers corresponding to returned rows (header = 1). */
  sourceRowNumbers?: number[];
};

export type MarketingDataSourcePort = {
  readonly providerType: MarketingDataSourceProviderType;
  listBindings(organizationId: string): Promise<{ id: string; displayName: string }[]>;
  discoverDatasets(bindingId: string): Promise<MarketingDatasetDescriptor[]>;
  getSchema?(bindingId: string, datasetId: string): Promise<MarketingDatasetSchema>;
  previewRows?(args: {
    bindingId: string;
    datasetId: string;
    limit: number;
  }): Promise<MarketingRowPage>;
  estimateAudience?(bindingId: string, datasetId: string): Promise<MarketingAudienceEstimate>;
  /**
   * Stream/page rows for future campaign execution — must NOT bulk-mirror into Supabase.
   * MKT-02: available for controlled reads; UI must never request unbounded pages.
   */
  streamRows?(args: {
    bindingId: string;
    datasetId: string;
    cursor?: string;
    limit: number;
  }): Promise<MarketingRowPage>;
  healthCheck?(bindingId: string): Promise<{ ok: boolean; message?: string; mode?: string }>;
};
