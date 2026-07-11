/**
 * EAF Asset Health Model — status exposure for Mission Control integration.
 */

import { EAF_ASSET_HEALTH_STATUS } from "@/constants/enterprise-asset-framework/asset-status";
import { EAF_LIFECYCLE_STATE_CODES } from "@/constants/enterprise-asset-framework/lifecycle-states";
import type {
  EafAssetHealthRecord,
  EafAssetHealthStatus,
} from "@/types/enterprise-asset-framework-definition";
import type { EafAssetTypeCode, EafBaseAsset, EafInternalId } from "@/types/enterprise-asset-framework";
import { getEafPorts } from "./composition";

export function resetEafHealthRecords(): void {
  getEafPorts().health.replaceAll([]);
}

export function listEafAssetHealthRecords(): EafAssetHealthRecord[] {
  return getEafPorts().health.list();
}

export function getEafAssetHealth(assetId: EafInternalId): EafAssetHealthRecord | undefined {
  return getEafPorts().health.findByAssetId(assetId);
}

export function upsertEafAssetHealth(record: EafAssetHealthRecord): void {
  getEafPorts().health.upsert(record);
}

export function assessEafAssetHealth(asset: EafBaseAsset): EafAssetHealthRecord {
  let status: EafAssetHealthStatus = EAF_ASSET_HEALTH_STATUS.HEALTHY;
  let message: string | undefined;

  if (!asset.activeFlag && asset.archiveFlag) {
    status = EAF_ASSET_HEALTH_STATUS.INACTIVE;
    message = "Asset is archived and inactive.";
  } else if (!asset.activeFlag) {
    status = EAF_ASSET_HEALTH_STATUS.WARNING;
    message = "Asset is not operationally active.";
  } else if (asset.lifecycleState === EAF_LIFECYCLE_STATE_CODES.DRAFT) {
    status = EAF_ASSET_HEALTH_STATUS.EXPERIMENTAL;
    message = "Asset is in draft lifecycle state.";
  }

  const record: EafAssetHealthRecord = {
    assetId: asset.id,
    assetTypeCode: asset.assetType,
    status,
    message,
    assessedOn: new Date().toISOString(),
  };

  upsertEafAssetHealth(record);
  return record;
}

export function getEafHealthSummaryByAssetType(
  assetTypeCode: EafAssetTypeCode,
): Record<EafAssetHealthStatus, number> {
  const records = listEafAssetHealthRecords().filter((r) => r.assetTypeCode === assetTypeCode);
  const summary: Record<EafAssetHealthStatus, number> = {
    healthy: 0,
    warning: 0,
    deprecated: 0,
    experimental: 0,
    inactive: 0,
  };

  for (const record of records) {
    summary[record.status] += 1;
  }

  return summary;
}
