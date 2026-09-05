/**
 * CO-MARKETING-REDESIGN-011 — Local fixture asset storage.
 * Never uploads to Hostinger, S3, CDN, or any live provider port.
 */

import {
  MARKETING_ASSET_FIXTURE_SCHEME,
  MARKETING_ASSET_STORAGE_PROVIDER,
} from "@/constants/enterprise-marketing-engine/assets";

const blobs = new Map<string, string>();

export function isExternalMarketingAssetLocation(url: string): boolean {
  const value = url.trim().toLowerCase();
  if (!value) return false;
  if (value.startsWith(MARKETING_ASSET_FIXTURE_SCHEME)) return false;
  if (value.startsWith("data:")) return false;
  return (
    value.includes("hostinger") ||
    value.includes("s3.amazonaws.com") ||
    value.includes("storage.googleapis.com") ||
    value.includes("blob.core.windows.net")
  );
}

export function assertMarketingAssetStaysOnFixture(url: string): void {
  if (isExternalMarketingAssetLocation(url)) {
    throw Object.assign(
      new Error("Marketing assets must use local fixture storage — external/Hostinger upload is forbidden"),
      { statusCode: 400, code: "ASSET_EXTERNAL_UPLOAD_FORBIDDEN" },
    );
  }
}

export function buildMarketingAssetFixtureRef(input: {
  organizationId: string;
  assetId: string;
  versionNumber: number;
}): string {
  return `${MARKETING_ASSET_FIXTURE_SCHEME}/${encodeURIComponent(input.organizationId)}/${encodeURIComponent(input.assetId)}/v${input.versionNumber}`;
}

export function putMarketingAssetFixture(storageRef: string, previewUrl: string): {
  storageProvider: typeof MARKETING_ASSET_STORAGE_PROVIDER;
  storageRef: string;
  previewUrl: string;
} {
  assertMarketingAssetStaysOnFixture(previewUrl);
  if (!storageRef.startsWith(MARKETING_ASSET_FIXTURE_SCHEME)) {
    throw Object.assign(new Error("Asset storage reference must use the fixture scheme"), {
      statusCode: 400,
      code: "ASSET_FIXTURE_REQUIRED",
    });
  }
  blobs.set(storageRef, previewUrl);
  return {
    storageProvider: MARKETING_ASSET_STORAGE_PROVIDER,
    storageRef,
    previewUrl,
  };
}

export function getMarketingAssetFixturePreview(storageRef: string): string | null {
  return blobs.get(storageRef) ?? null;
}

export function resetMarketingAssetFixtureStorage(): void {
  blobs.clear();
}
