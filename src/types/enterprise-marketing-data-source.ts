/**
 * CO-MARKETING-MKT-02 — Binding metadata types (config only — never audience rows).
 */

import type { MarketingDataSourceProviderType } from "@/lib/enterprise-marketing-engine/ports/data-source.port";
import type { MarketingWorkbookConnectionState } from "@/constants/enterprise-marketing-engine/authorised-workbook";

export type MarketingDataSourceBindingStatus = "ACTIVE" | "DISABLED" | "ERROR";

export type MarketingDataSourceBinding = {
  id: string;
  organizationId: string;
  providerType: MarketingDataSourceProviderType;
  displayName: string;
  /** Google Spreadsheet ID (or fixture id). */
  spreadsheetId: string;
  /** Optional Drive file id when distinct — usually same as spreadsheetId. */
  driveFileId?: string | null;
  /** Points at server env credential bundle — never stores secrets. */
  authRef: string;
  status: MarketingDataSourceBindingStatus;
  lastHealthAt?: string | null;
  lastHealthOk?: boolean | null;
  lastHealthMessage?: string | null;
  lastDiscoverAt?: string | null;
  lastError?: string | null;
  connectionState?: MarketingWorkbookConnectionState;
  createdAt: string;
  updatedAt: string;
};

export type MarketingDatasetCacheEntry = {
  externalDatasetId: string;
  displayName: string;
  sheetGid?: number;
  rowCountEstimate?: number | null;
  schemaFingerprint?: string | null;
  headers?: string[];
  refreshedAt: string;
};
