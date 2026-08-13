/**
 * CO-MARKETING-MKT-01 — Marketing Asset Storage Port (contract only).
 * Separate from Opportunity Document Registry.
 */

export type MarketingAssetUploadRequest = {
  organizationId: string;
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
  tags?: string[];
};

export type MarketingAssetStoragePort = {
  put(request: MarketingAssetUploadRequest): Promise<{
    assetId: string;
    storageUrl: string;
    checksum: string;
  }>;
  archive(assetId: string): Promise<void>;
};
